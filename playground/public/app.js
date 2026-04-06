// ── State ──────────────────────────────────────────────────────────────────────
let callbackUrl = "";
let webhookFixtures = {};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Load initial config status
  const resp = await api("GET", "/api/config");
  if (resp.success && resp.data?.isConnected) {
    setConnected(resp.data);
  }
  callbackUrl = resp.callbackUrl || `${location.origin}/api/webhooks/receive`;
  document.getElementById("cfgCallbackUrl").value = callbackUrl;
  document.getElementById("webhookUrl").textContent = callbackUrl;

  // Load fixtures for webhook panel
  const fix = await api("GET", "/api/fixtures");
  if (fix.success) webhookFixtures = fix.data.webhooks || {};

  // Pre-fill webhook parse textarea
  if (webhookFixtures.kenyaSuccess) {
    document.getElementById("wh-body").value = JSON.stringify(webhookFixtures.kenyaSuccess, null, 2);
  }

  // Start SSE for live webhooks
  startWebhookStream();
});

// ── API Helper ────────────────────────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  return resp.json();
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function toggleCard(id) {
  document.getElementById(id).classList.toggle("collapsed");
}

function setBadge(id, status) {
  const el = document.getElementById(id);
  el.className = `badge badge-${status}`;
  el.textContent = status;
}

function showResult(containerId, data) {
  const el = document.getElementById(containerId);
  const isSuccess = data.success;
  const cls = isSuccess ? "result-success" : "result-error";
  const label = isSuccess ? "Success" : `Error — ${data.error?.type || "Unknown"}`;
  const duration = data.duration ? `${data.duration}ms` : "";

  const content = isSuccess
    ? JSON.stringify(data.data, null, 2)
    : JSON.stringify(data.error, null, 2);

  el.innerHTML = `
    <div class="result ${cls}">
      <div class="result-header">
        <span>${label}</span>
        <span>${duration}</span>
      </div>
      <pre>${escapeHtml(content)}</pre>
    </div>
  `;

  // If we got a transactionReference, make it clickable
  const ref = data.data?.transactionReference;
  if (ref) {
    const refLink = document.createElement("div");
    refLink.style.cssText = "margin-top:8px;font-size:12px;";
    refLink.innerHTML = `Transaction Ref: <code style="color:var(--accent);cursor:pointer" onclick="lookupRef('${ref}')">${ref}</code> (click to look up)`;
    el.appendChild(refLink);
  }

  // If we got a checkoutUrl, show it as a link
  const checkout = data.data?.checkoutUrl;
  if (checkout) {
    const link = document.createElement("div");
    link.style.cssText = "margin-top:8px;font-size:12px;";
    link.innerHTML = `Checkout: <a href="${checkout}" target="_blank" style="color:var(--blue)">${checkout}</a>`;
    el.appendChild(link);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function lookupRef(ref) {
  document.getElementById("tx-ref").value = ref;
  document.getElementById("txStatusBody").classList.remove("collapsed");
  document.getElementById("txStatusBody").scrollIntoView({ behavior: "smooth" });
}

// ── Config ────────────────────────────────────────────────────────────────────
async function saveConfig() {
  const body = {
    apiUsername: document.getElementById("cfgApiUsername").value,
    apiPassword: document.getElementById("cfgApiPassword").value,
    defaultUsername: document.getElementById("cfgUsername").value,
    defaultCallbackUrl: document.getElementById("cfgCallbackUrl").value,
    walletType: document.getElementById("cfgWalletType").value,
    baseUrl: document.getElementById("cfgBaseUrl").value || undefined,
  };
  const resp = await api("POST", "/api/config", body);
  if (resp.success) {
    setConnected(resp.data);
    document.getElementById("configBody").classList.add("collapsed");
  } else {
    alert(resp.error?.message || "Failed to connect");
  }
}

function setConnected(config) {
  document.getElementById("statusDot").classList.add("connected");
  document.getElementById("statusText").textContent = `Connected — ${config.apiUsername}`;
  document.getElementById("configBadge").className = "badge badge-pass";
  document.getElementById("configBadge").textContent = "connected";
}

// ── SDK Operation Executors ───────────────────────────────────────────────────

async function execWithBadge(badgeId, resultId, method, url, body) {
  setBadge(badgeId, "running");
  const resp = await api(method, url, body);
  setBadge(badgeId, resp.success ? "pass" : "fail");
  showResult(resultId, resp);
  return resp;
}

async function execBalances() {
  const username = document.getElementById("bal-username").value;
  const qs = username ? `?username=${encodeURIComponent(username)}` : "";
  await execWithBadge("balances-badge", "balances-result", "GET", `/api/balances${qs}`);
}

async function execNetworks() {
  const type = document.getElementById("net-type").value;
  const dialCode = document.getElementById("net-dialCode").value;
  const resp = await execWithBadge(
    "networks-badge", "networks-result", "GET",
    `/api/networks/discover?transactionType=${type}&dialCode=${encodeURIComponent(dialCode)}`
  );

  // Add "Use" buttons for each network
  if (resp.success && resp.data) {
    const container = document.getElementById("networks-result");
    const networks = [...(resp.data.mobile || []), ...(resp.data.banks || [])];
    if (networks.length) {
      const btns = document.createElement("div");
      btns.style.cssText = "margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;";
      for (const n of networks) {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm";
        btn.textContent = `Use: ${n.name} (${n.accountNumberType})`;
        btn.onclick = () => fillNetworkParams(n);
        btns.appendChild(btn);
      }
      container.appendChild(btns);
    }
  }
}

function fillNetworkParams(network) {
  // Fill Pan-African Collection
  document.getElementById("cp-networkCode").value = network.id;
  document.getElementById("cp-channelId").value = network.selectedChannelId;
  document.getElementById("cp-accountName").value = network.accountNumberType;
  document.getElementById("cp-txChannel").value = network.accountNumberType;
  // Fill Pan-African Payout
  document.getElementById("pp-networkCode").value = network.id;
  document.getElementById("pp-channelId").value = network.selectedChannelId;
  document.getElementById("pp-accountName").value = network.accountNumberType;
  document.getElementById("pp-txChannel").value = network.accountNumberType;
  document.getElementById("pp-providerName").value = network.name;
  document.getElementById("pp-providerCode").value = network.code;
}

async function execTxStatus() {
  const ref = document.getElementById("tx-ref").value;
  await execWithBadge("txstatus-badge", "txstatus-result", "GET", `/api/transactions/status/${encodeURIComponent(ref)}`);
}

async function execCollMpesa() {
  await execWithBadge("coll-mpesa-badge", "coll-mpesa-result", "POST", "/api/collections/mpesa", {
    amount: document.getElementById("cm-amount").value,
    phoneNumber: document.getElementById("cm-phone").value,
    narration: document.getElementById("cm-narration").value,
  });
}

async function execCollCard() {
  await execWithBadge("coll-card-badge", "coll-card-result", "POST", "/api/collections/card", {
    amount: document.getElementById("cc-amount").value,
    phoneNumber: document.getElementById("cc-phone").value,
    narration: document.getElementById("cc-narration").value,
  });
}

async function execCollPan() {
  await execWithBadge("coll-pan-badge", "coll-pan-result", "POST", "/api/collections/pan-african", {
    accountName: document.getElementById("cp-accountName").value,
    amount: document.getElementById("cp-amount").value,
    phoneNumber: document.getElementById("cp-phone").value,
    accountNumber: document.getElementById("cp-accountNumber").value,
    networkCode: document.getElementById("cp-networkCode").value,
    channelId: document.getElementById("cp-channelId").value,
    transactionChannel: document.getElementById("cp-txChannel").value,
    currency: document.getElementById("cp-currency").value,
    narration: document.getElementById("cp-narration").value,
    redirectUrl: document.getElementById("cp-redirectUrl").value || undefined,
  });
}

async function execPayMpesa() {
  await execWithBadge("pay-mpesa-badge", "pay-mpesa-result", "POST", "/api/payouts/mpesa", {
    phoneNumber: document.getElementById("pm-phone").value,
    amount: document.getElementById("pm-amount").value,
    narration: document.getElementById("pm-narration").value,
  });
}

async function execPayMerchant() {
  await execWithBadge("pay-merchant-badge", "pay-merchant-result", "POST", "/api/payouts/merchant", {
    amount: document.getElementById("pmerch-amount").value,
    phoneNumber: document.getElementById("pmerch-phone").value,
    businessAccount: document.getElementById("pmerch-bizAcct").value,
    businessNumber: document.getElementById("pmerch-bizNum").value,
    narration: document.getElementById("pmerch-narration").value,
  });
}

async function execPayPan() {
  await execWithBadge("pay-pan-badge", "pay-pan-result", "POST", "/api/payouts/pan-african", {
    accountName: document.getElementById("pp-accountName").value,
    accountHolderName: document.getElementById("pp-holderName").value,
    accountNumber: document.getElementById("pp-accountNumber").value,
    amount: document.getElementById("pp-amount").value,
    phoneNumber: document.getElementById("pp-phone").value,
    currency: document.getElementById("pp-currency").value,
    networkCode: document.getElementById("pp-networkCode").value,
    channelId: document.getElementById("pp-channelId").value,
    transactionChannel: document.getElementById("pp-txChannel").value,
    providerName: document.getElementById("pp-providerName").value,
    providerCode: document.getElementById("pp-providerCode").value,
    narration: document.getElementById("pp-narration").value,
  });
}

async function execTransfer() {
  await execWithBadge("transfer-badge", "transfer-result", "POST", "/api/transfers/send", {
    receiverUsername: document.getElementById("tr-receiver").value,
    amount: document.getElementById("tr-amount").value,
    narration: document.getElementById("tr-narration").value,
    phoneNumber: document.getElementById("tr-phone").value || undefined,
  });
}

// ── Webhook Parsing / Verification ────────────────────────────────────────────

function loadFixture(name) {
  const map = {
    "kenya-success": webhookFixtures.kenyaSuccess,
    "kenya-failure": webhookFixtures.kenyaFailure,
    "pan-success": webhookFixtures.panAfricanSuccess,
    "pan-failure": webhookFixtures.panAfricanFailure,
  };
  const data = map[name];
  if (data) {
    document.getElementById("wh-body").value = JSON.stringify(data, null, 2);
  }
}

async function execWhParse() {
  let body;
  try {
    body = JSON.parse(document.getElementById("wh-body").value);
  } catch {
    alert("Invalid JSON in body field");
    return;
  }
  await execWithBadge("wh-parse-badge", "wh-parse-result", "POST", "/api/webhooks/parse", { body });
}

async function execWhVerify() {
  const body = document.getElementById("whv-body").value;
  const signature = document.getElementById("whv-sig").value;
  const secret = document.getElementById("whv-secret").value;
  await execWithBadge("wh-verify-badge", "wh-verify-result", "POST", "/api/webhooks/verify", {
    body, signature, secret,
  });
}

// ── Live Webhook Stream (SSE) ─────────────────────────────────────────────────
function startWebhookStream() {
  const evtSource = new EventSource("/api/webhooks/stream");
  evtSource.onmessage = (e) => {
    if (e.data === "connected") return;
    try {
      const entry = JSON.parse(e.data);
      addWebhookEvent(entry);
    } catch {}
  };
  // Also load existing events
  loadExistingWebhooks();
}

async function loadExistingWebhooks() {
  const resp = await api("GET", "/api/webhooks/events");
  if (resp.success && resp.data?.length) {
    for (const entry of resp.data.reverse()) {
      addWebhookEvent(entry);
    }
  }
}

function addWebhookEvent(entry) {
  const list = document.getElementById("webhookList");
  // Remove "no events" placeholder
  const placeholder = list.querySelector(".no-events");
  if (placeholder) placeholder.remove();

  const event = entry.event || {};
  const isSuccess = event.isSuccess;
  const badgeClass = isSuccess === true ? "badge-pass" : isSuccess === false ? "badge-fail" : "badge-info";
  const badgeText = isSuccess === true ? "success" : isSuccess === false ? "failed" : "raw";
  const time = new Date(entry.receivedAt).toLocaleTimeString();

  const div = document.createElement("div");
  div.className = "webhook-event";
  div.innerHTML = `
    <div class="we-header">
      <span class="we-ref">${event.transactionReference || "—"}</span>
      <span class="badge ${badgeClass}" style="font-size:10px">${badgeText}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim)">
      <span>${event.transactionType || ""} ${event.amount != null ? "• " + event.amount : ""}</span>
      <span class="we-time">${time}</span>
    </div>
    <pre>${escapeHtml(JSON.stringify(event._raw || event, null, 2))}</pre>
  `;

  list.prepend(div);
}

function copyWebhookUrl() {
  navigator.clipboard.writeText(callbackUrl);
}

async function clearWebhooks() {
  await api("DELETE", "/api/webhooks/events");
  const list = document.getElementById("webhookList");
  list.innerHTML = '<div class="no-events">No events yet. Webhooks will appear here in real time.</div>';
}

// ── Run All Tests ─────────────────────────────────────────────────────────────

async function runAll() {
  if (!confirm("This will run all tests, including live API calls that may initiate real transactions. Continue?")) return;

  const panel = document.getElementById("runAllPanel");
  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth" });

  const summaryEl = document.getElementById("runAllSummary");
  const resultsEl = document.getElementById("runAllResults");

  summaryEl.innerHTML = '<span style="color:var(--accent)">Running tests...</span>';
  resultsEl.innerHTML = "";

  const resp = await api("POST", "/api/run-all");

  if (!resp.success) {
    summaryEl.innerHTML = `<span style="color:var(--red)">${resp.error?.message || "Failed"}</span>`;
    return;
  }

  const { summary, results } = resp;

  summaryEl.innerHTML = `
    <span>Total: ${summary.total}</span>
    <span style="color:var(--green)">Passed: ${summary.passed}</span>
    <span style="color:var(--red)">Failed: ${summary.failed}</span>
  `;

  resultsEl.innerHTML = results.map(r => `
    <div class="test-row">
      <span class="test-name">${r.name}</span>
      <span class="test-duration">${r.duration}ms</span>
      <span class="badge badge-${r.status}">${r.status}</span>
    </div>
    ${r.status === "fail" ? `<div style="padding:4px 12px 8px;font-size:12px;color:var(--red)">${escapeHtml(r.reason || JSON.stringify(r.response?.error, null, 2))}</div>` : ""}
  `).join("");
}
