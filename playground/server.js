import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  initFromEnv,
  configure,
  disconnect,
  getClient,
  getConfig,
  classifyError,
} from "./lib/sdk-client.js";
import { fixtures } from "./lib/fixtures.js";
import { tests } from "./lib/test-suite.js";
import { Webhooks } from "payd-node-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3456;

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

function getDefaultCallbackUrl(req) {
  if (process.env.PAYD_CALLBACK_URL) return process.env.PAYD_CALLBACK_URL;

  const externalBaseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN;

  if (externalBaseUrl) {
    const normalizedBaseUrl = externalBaseUrl.startsWith("http")
      ? externalBaseUrl
      : `https://${externalBaseUrl}`;
    return `${normalizedBaseUrl.replace(/\/$/, "")}/api/webhooks/receive`;
  }

  if (req) {
    const forwardedProto = req.get("x-forwarded-proto");
    const forwardedHost = req.get("x-forwarded-host");
    const host = forwardedHost || req.get("host");
    const protocol = forwardedProto || req.protocol || "http";
    if (host) return `${protocol}://${host}/api/webhooks/receive`;
  }

  return `http://localhost:${PORT}/api/webhooks/receive`;
}

function getRequestBaseUrl(req) {
  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const protocol = forwardedProto || req.protocol || "http";

  if (host) return `${protocol}://${host}`;
  return `http://localhost:${PORT}`;
}

const SESSION_COOKIE_NAME = "payd_playground_sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function parseCookies(req) {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return raw.split(";").reduce((acc, pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return acc;
    const key = pair.slice(0, idx).trim();
    const value = decodeURIComponent(pair.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

function isSafeSessionId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,128}$/.test(value);
}

function issueSessionCookie(res, sessionId) {
  const secure = process.env.NODE_ENV === "production";
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

// ── In-memory webhook event log ───────────────────────────────────────────────
const webhookEvents = [];
const MAX_EVENTS = 100;

// SSE clients for live webhook streaming
const sseClients = new Set();

// ── Try env-based init ────────────────────────────────────────────────────────
initFromEnv();

app.use((req, res, next) => {
  const headerSessionId = req.get("x-session-id");
  const cookieSessionId = parseCookies(req)[SESSION_COOKIE_NAME];

  let sessionId = isSafeSessionId(headerSessionId) ? headerSessionId : cookieSessionId;
  if (!isSafeSessionId(sessionId)) {
    sessionId = randomUUID().replace(/-/g, "");
    issueSessionCookie(res, sessionId);
  }

  req.sessionId = sessionId;
  next();
});

// ── Middleware: require SDK client ────────────────────────────────────────────
function requireClient(req, res, next) {
  if (!getClient(req.sessionId)) {
    return res.status(400).json({
      success: false,
      error: {
        type: "NotConfigured",
        message: "SDK not configured. Set credentials in the Configuration panel first.",
      },
    });
  }
  next();
}

// ── Utility: wrap SDK calls ──────────────────────────────────────────────────
async function sdkCall(res, fn) {
  const start = Date.now();
  try {
    const data = await fn();
    return res.json({ success: true, data, duration: Date.now() - start });
  } catch (error) {
    return res.json({
      success: false,
      error: classifyError(error),
      duration: Date.now() - start,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/config", (req, res) => {
  const config = getConfig(req.sessionId);
  res.json({
    success: true,
    data: config,
    callbackUrl: getDefaultCallbackUrl(req),
  });
});

app.post("/api/config", (req, res) => {
  try {
    const { apiUsername, apiPassword, defaultUsername, defaultCallbackUrl, walletType, baseUrl } =
      req.body;

    if (!apiUsername || !apiPassword) {
      return res.status(400).json({
        success: false,
        error: { type: "ValidationError", message: "apiUsername and apiPassword are required" },
      });
    }

    configure(req.sessionId, {
      apiUsername,
      apiPassword,
      defaultUsername: defaultUsername || "",
      defaultCallbackUrl: defaultCallbackUrl || getDefaultCallbackUrl(req),
      walletType: walletType || "local",
      baseUrl: baseUrl || undefined,
    });

    res.json({ success: true, data: getConfig(req.sessionId) });
  } catch (error) {
    res.status(400).json({ success: false, error: classifyError(error) });
  }
});

app.delete("/api/config", (req, res) => {
  const removed = disconnect(req.sessionId);
  const config = getConfig(req.sessionId);
  res.json({
    success: true,
    data: config,
    disconnected: removed,
    callbackUrl: getDefaultCallbackUrl(req),
  });
});

app.get("/api/fixtures", (req, res) => {
  res.json({ success: true, data: fixtures });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/collections/mpesa", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.collections.mpesa({
      username: req.body.username || "",
      amount: Number(req.body.amount),
      phoneNumber: req.body.phoneNumber,
      narration: req.body.narration,
      callbackUrl: req.body.callbackUrl || "",
    }),
  );
});

app.post("/api/collections/card", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.collections.card({
      username: req.body.username || "",
      amount: Number(req.body.amount),
      phoneNumber: req.body.phoneNumber,
      narration: req.body.narration,
      callbackUrl: req.body.callbackUrl || "",
    }),
  );
});

app.post("/api/collections/pan-african", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.collections.panAfrican({
      username: req.body.username || "",
      accountName: req.body.accountName,
      amount: Number(req.body.amount),
      phoneNumber: req.body.phoneNumber,
      accountNumber: req.body.accountNumber,
      networkCode: req.body.networkCode,
      channelId: req.body.channelId,
      narration: req.body.narration,
      currency: req.body.currency,
      callbackUrl: req.body.callbackUrl || "",
      transactionChannel: req.body.transactionChannel,
      redirectUrl: req.body.redirectUrl || undefined,
    }),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYOUTS
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/payouts/mpesa", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.payouts.mpesa({
      phoneNumber: req.body.phoneNumber,
      amount: Number(req.body.amount),
      narration: req.body.narration,
      callbackUrl: req.body.callbackUrl || "",
      walletType: req.body.walletType || undefined,
    }),
  );
});

app.post("/api/payouts/pan-african", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.payouts.panAfrican({
      username: req.body.username || "",
      networkCode: req.body.networkCode,
      accountName: req.body.accountName,
      accountHolderName: req.body.accountHolderName,
      accountNumber: req.body.accountNumber,
      amount: Number(req.body.amount),
      phoneNumber: req.body.phoneNumber,
      channelId: req.body.channelId,
      narration: req.body.narration,
      currency: req.body.currency,
      callbackUrl: req.body.callbackUrl || "",
      transactionChannel: req.body.transactionChannel,
      providerName: req.body.providerName,
      providerCode: req.body.providerCode,
      walletType: req.body.walletType || undefined,
    }),
  );
});

app.post("/api/payouts/merchant", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.payouts.merchant({
      username: req.body.username || "",
      amount: Number(req.body.amount),
      phoneNumber: req.body.phoneNumber,
      narration: req.body.narration,
      businessAccount: req.body.businessAccount,
      businessNumber: req.body.businessNumber,
      callbackUrl: req.body.callbackUrl || "",
      walletType: req.body.walletType || undefined,
    }),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFERS
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/transfers/send", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.transfers.send({
      receiverUsername: req.body.receiverUsername,
      amount: Number(req.body.amount),
      narration: req.body.narration,
      phoneNumber: req.body.phoneNumber || undefined,
      currency: req.body.currency || undefined,
      walletType: req.body.walletType || undefined,
    }),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORKS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/networks/discover", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () =>
    payd.networks.discover(req.query.transactionType, req.query.dialCode),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/transactions/status/:ref", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () => payd.transactions.getStatus(req.params.ref));
});

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/balances", requireClient, (req, res) => {
  const payd = getClient(req.sessionId);
  sdkCall(res, () => payd.balances.getAll(req.query.username || undefined));
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

// Live webhook receiver — Payd posts here
app.post("/api/webhooks/receive", (req, res) => {
  const payd = getClient();
  let event;

  try {
    if (payd) {
      event = payd.webhooks.parseEvent(req.body);
    } else {
      event = { _raw: req.body, transactionReference: req.body.transaction_reference || "" };
    }
  } catch {
    event = { _raw: req.body, parseError: true };
  }

  const entry = { receivedAt: new Date().toISOString(), event };
  webhookEvents.unshift(entry);
  if (webhookEvents.length > MAX_EVENTS) webhookEvents.pop();

  // Notify SSE clients
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  console.log(`[Webhook] Received: ${event.transactionReference || "unknown"}`);
  res.status(200).json({ received: true });
});

// Get stored webhook events
app.get("/api/webhooks/events", (req, res) => {
  res.json({ success: true, data: webhookEvents });
});

// Clear webhook events
app.delete("/api/webhooks/events", (req, res) => {
  webhookEvents.length = 0;
  res.json({ success: true });
});

// SSE stream for live webhook events
app.get("/api/webhooks/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("data: connected\n\n");
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

// Manual parse endpoint
app.post("/api/webhooks/parse", (req, res) => {
  const payd = getClient(req.sessionId);
  const webhooksUtil = payd ? payd.webhooks : new Webhooks();
  const start = Date.now();
  try {
    const data = webhooksUtil.parseEvent(req.body.body || req.body);
    res.json({ success: true, data, duration: Date.now() - start });
  } catch (error) {
    res.json({ success: false, error: classifyError(error), duration: Date.now() - start });
  }
});

// Manual verify endpoint
app.post("/api/webhooks/verify", (req, res) => {
  const payd = getClient(req.sessionId);
  const webhooksUtil = payd ? payd.webhooks : new Webhooks();
  const start = Date.now();
  try {
    const valid = webhooksUtil.verify(
      typeof req.body.body === "string" ? req.body.body : JSON.stringify(req.body.body),
      req.body.signature,
      req.body.secret,
    );
    res.json({ success: true, data: { valid }, duration: Date.now() - start });
  } catch (error) {
    res.json({ success: false, error: classifyError(error), duration: Date.now() - start });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/run-all", async (req, res) => {
  if (!getClient(req.sessionId)) {
    return res.status(400).json({
      success: false,
      error: { type: "NotConfigured", message: "Configure credentials first." },
    });
  }

  const results = [];
  const context = {};
  const baseUrl = getRequestBaseUrl(req);

  for (const test of tests) {
    const start = Date.now();
    const endpoint = typeof test.endpoint === "function" ? test.endpoint(context) : test.endpoint;
    const params = test.params(context);

    try {
      const fetchOpts = { headers: { "Content-Type": "application/json" } };
      fetchOpts.headers["x-session-id"] = req.sessionId;

      if (test.method === "POST") {
        fetchOpts.method = "POST";
        fetchOpts.body = JSON.stringify(params);
      }

      const resp = await fetch(`${baseUrl}${endpoint}`, fetchOpts);
      const data = await resp.json();
      const duration = Date.now() - start;

      if (test.saveToContext && data.success) {
        test.saveToContext(context, data);
      }

      const validation = test.validate(data);

      results.push({
        name: test.name,
        category: test.category,
        status: data.success && validation.pass ? "pass" : "fail",
        duration,
        reason: validation.pass ? null : validation.reason,
        response: data,
      });
    } catch (error) {
      results.push({
        name: test.name,
        category: test.category,
        status: "fail",
        duration: Date.now() - start,
        reason: error.message,
      });
    }
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  res.json({
    success: true,
    summary: { total: results.length, passed, failed },
    results,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`\n  Payd SDK Test App`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Dashboard:    http://localhost:${PORT}`);
  console.log(`  Webhook URL:  http://localhost:${PORT}/api/webhooks/receive`);
  console.log(`  SDK Status:   Session-based credentials required`);
  console.log(`  ─────────────────────────────────────\n`);
});
