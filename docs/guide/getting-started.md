# Getting Started

## Overview

The **Payd Node SDK** (`payd-node-sdk`) is the official Node.js client for the [Payd](https://payd.money) payments API. It lets you:

- **Collect payments** via M-Pesa STK Push, card checkout, and Pan-African mobile money / bank transfer
- **Send payouts** to M-Pesa users, Pan-African wallets/banks, and Paybill/Till merchants
- **Transfer funds** instantly between Payd accounts
- **Query resources** like account balances, transaction status, and available payment networks
- **Handle webhooks** with typed parsing and HMAC signature verification

The SDK is written in TypeScript, has **zero runtime dependencies**, ships both ESM and CommonJS builds, and requires **Node.js 18+**.

## Installation

::: code-group
```bash [npm]
npm install payd-node-sdk
```

```bash [pnpm]
pnpm add payd-node-sdk
```

```bash [yarn]
yarn add payd-node-sdk
```
:::

## Quick Start

### 1. Get your API credentials

Sign up at [payd.money](https://payd.money) and retrieve your **API username** and **API password** from the dashboard. You'll also need your **Payd account username** (the account that receives/sends funds).

### 2. Initialize the client

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: process.env.PAYD_USERNAME!,
  defaultCallbackUrl: "https://my-server.com/webhook",
});
```

### 3. Collect a payment

```typescript
const result = await payd.collections.mpesa({
  username: "my_payd_user", // or omit to use defaultUsername
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "https://my-server.com/webhook", // or omit to use default
});

console.log(result.transactionReference);
// => "9BD103350408eR"
```

### 4. Handle the webhook

```typescript
// In your Express/Fastify/Hono handler:
app.post("/webhook", (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  if (event.isSuccess) {
    console.log(`Payment ${event.transactionReference} succeeded!`);
    // Update order status, credit user, etc.
  } else {
    console.log(`Payment failed: ${event.remarks}`);
  }

  res.status(200).send("OK");
});
```

## What's Next?

- [Configuration](/guide/configuration) — All client options explained
- [Authentication](/guide/authentication) — How auth works
- [M-Pesa Collections](/guide/collections-mpesa) — Collect via STK Push
- [Error Handling](/guide/error-handling) — Catch and handle errors gracefully
