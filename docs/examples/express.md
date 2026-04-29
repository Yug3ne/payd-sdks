# Express Integration

A complete Express.js example showing M-Pesa collection with webhook handling.

## Setup

```bash
npm install express payd-node-sdk
npm install -D @types/express tsx
```

## Full Example

```typescript
// server.ts
import express from "express";
import {
  PaydClient,
  PaydValidationError,
  PaydAPIError,
  PaydWebhookVerificationError,
} from "payd-node-sdk";

const app = express();
app.use(express.json());

// Initialize Payd client
const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: process.env.PAYD_USERNAME!,
  defaultCallbackUrl: `${process.env.BASE_URL}/webhook/payd`,
  debug: process.env.NODE_ENV === "development",
});

// In-memory store (use a real database in production)
const orders = new Map<string, { id: string; amount: number; status: string; ref?: string }>();

// ─── Create Payment ────────────────────────────────────────────────────────

app.post("/api/pay", async (req, res) => {
  const { orderId, amount, phoneNumber, method } = req.body;

  try {
    let result;

    if (method === "mpesa") {
      result = await payd.collections.mpesa({
        username: "",
        amount,
        phoneNumber,
        narration: `Payment for order ${orderId}`,
        callbackUrl: "",
      });
    } else if (method === "card") {
      result = await payd.collections.card({
        username: "",
        amount,
        phoneNumber,
        narration: `Payment for order ${orderId}`,
        callbackUrl: "",
      });

      // Card payments return a checkout URL
      orders.set(result.transactionReference, {
        id: orderId,
        amount,
        status: "pending",
        ref: result.transactionReference,
      });

      res.json({
        success: true,
        checkoutUrl: result.checkoutUrl,
        transactionReference: result.transactionReference,
      });
      return;
    } else {
      res.status(400).json({ error: "Invalid payment method" });
      return;
    }

    // Store the transaction reference
    orders.set(result.transactionReference, {
      id: orderId,
      amount,
      status: "pending",
      ref: result.transactionReference,
    });

    res.json({
      success: true,
      transactionReference: result.transactionReference,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof PaydValidationError) {
      res.status(400).json({
        error: error.message,
        field: error.field,
      });
    } else if (error instanceof PaydAPIError) {
      res.status(502).json({
        error: error.message,
        code: error.statusCode,
      });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ─── Webhook Handler ───────────────────────────────────────────────────────

app.post("/webhook/payd", (req, res) => {
  // Always respond 200 immediately
  res.status(200).send("OK");

  try {
    const event = payd.webhooks.parseEvent(req.body);

    console.log(`Webhook received: ${event.transactionReference}`);
    console.log(`  Success: ${event.isSuccess}`);
    console.log(`  Type: ${event.transactionType}`);
    console.log(`  Amount: ${event.amount}`);

    // Find the matching order
    const order = orders.get(event.transactionReference);
    if (!order) {
      console.warn(`No order found for ref: ${event.transactionReference}`);
      return;
    }

    if (event.isSuccess) {
      order.status = "paid";
      console.log(`Order ${order.id} paid successfully!`);
      // Fulfill the order, send confirmation email, etc.
    } else {
      order.status = "failed";
      console.log(`Order ${order.id} payment failed: ${event.remarks}`);
    }
  } catch (error) {
    console.error("Failed to process webhook:", error);
  }
});

// ─── Check Order Status ────────────────────────────────────────────────────

app.get("/api/orders/:id", (req, res) => {
  const order = [...orders.values()].find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

// ─── Check Balance ─────────────────────────────────────────────────────────

app.get("/api/balance", async (_req, res) => {
  try {
    const balances = await payd.balances.getAll();
    res.json({
      kes: balances.fiatBalance.balance,
      usd: balances.onchainBalance.balance,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch balances" });
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Run

```bash
export PAYD_API_USERNAME="your_api_username"
export PAYD_API_PASSWORD="your_api_password"
export PAYD_USERNAME="your_payd_username"
export BASE_URL="https://your-domain.com"

npx tsx server.ts
```

## Test

```bash
# Create an M-Pesa payment
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD001","amount":100,"phoneNumber":"0700000000","method":"mpesa"}'

# Check balance
curl http://localhost:3000/api/balance

# Check order status (after webhook)
curl http://localhost:3000/api/orders/ORD001
```

## With Webhook Verification

If using Payd Connect with signed webhooks, update the webhook handler:

```typescript
// Use express.text() instead of express.json() for the webhook route
app.post("/webhook/payd", express.text({ type: "*/*" }), (req, res) => {
  res.status(200).send("OK");

  try {
    const event = payd.webhooks.constructEvent(
      req.body,
      req.headers["x-payd-connect-signature"] as string,
      process.env.WEBHOOK_SECRET!,
    );

    // Process verified event...
  } catch (error) {
    if (error instanceof PaydWebhookVerificationError) {
      console.error("Invalid webhook signature!");
    }
  }
});
```
