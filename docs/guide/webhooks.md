# Webhooks

Payd uses webhooks to notify your server when a transaction completes (succeeds or fails). The SDK provides utilities to parse, verify, and type webhook payloads.

## How Webhooks Work

1. You provide a `callbackUrl` when initiating a transaction
2. When the transaction completes, Payd sends a `POST` request to that URL
3. Your server parses the payload and updates your records
4. You respond with HTTP `200` to acknowledge receipt

## Parsing Webhooks

### `parseEvent(body)`

Parse a raw webhook payload into a typed `WebhookEvent`:

```typescript
app.post("/webhook", (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  console.log(event.transactionReference);  // "9BD103739849eR"
  console.log(event.isSuccess);             // true
  console.log(event.transactionType);       // "receipt"
  console.log(event.amount);               // 500
  console.log(event.thirdPartyTransId);    // "UB9C46DH3Q" (M-Pesa receipt)
  console.log(event.remarks);              // "Successfully processed"

  res.status(200).send("OK");
});
```

Accepts either a **JSON string** or an **already-parsed object**:

```typescript
// Both work:
payd.webhooks.parseEvent('{"transaction_reference":"..."}');
payd.webhooks.parseEvent(req.body); // Already parsed by Express
```

## Derived Fields

The `parseEvent` method adds two convenience fields that are not in the raw payload:

### `isSuccess`

A boolean computed from `result_code === 0 && success === true`:

```typescript
if (event.isSuccess) {
  // Transaction completed successfully
} else {
  // Transaction failed
  console.log(event.remarks); // Failure reason
}
```

### `transactionType`

Derived from the transaction reference suffix:

| Suffix | `transactionType` | Meaning |
|--------|-------------------|---------|
| `eR` | `"receipt"` | Collection (payin) |
| `eW` | `"withdrawal"` | Payout |
| `eS` | `"transfer"` | P2P transfer |
| `eT` | `"topup"` | Account topup |
| Other | `"unknown"` | Unrecognized |

```typescript
const event = payd.webhooks.parseEvent(body);

switch (event.transactionType) {
  case "receipt":
    handlePaymentReceived(event);
    break;
  case "withdrawal":
    handlePayoutCompleted(event);
    break;
  case "transfer":
    handleTransferCompleted(event);
    break;
}
```

## Webhook Verification

If your webhooks are delivered through **Payd Connect** or a middleware layer that signs payloads, you can verify the HMAC-SHA256 signature.

### `verify(body, signature, secret)`

Verify a webhook signature. Throws `PaydWebhookVerificationError` if invalid:

```typescript
app.post("/webhook", express.text({ type: "*/*" }), (req, res) => {
  const signature = req.headers["x-payd-connect-signature"] as string;

  try {
    payd.webhooks.verify(req.body, signature, process.env.WEBHOOK_SECRET!);
    // Signature valid
  } catch (error) {
    // Signature invalid — reject the request
    res.status(401).send("Invalid signature");
    return;
  }

  const event = payd.webhooks.parseEvent(req.body);
  // Process event...

  res.status(200).send("OK");
});
```

### `constructEvent(body, signature, secret)`

Verify and parse in a single step:

```typescript
app.post("/webhook", express.text({ type: "*/*" }), (req, res) => {
  try {
    const event = payd.webhooks.constructEvent(
      req.body,
      req.headers["x-payd-connect-signature"] as string,
      process.env.WEBHOOK_SECRET!,
    );

    // Signature verified and event parsed
    if (event.isSuccess) {
      await processPayment(event);
    }
  } catch (error) {
    if (error instanceof PaydWebhookVerificationError) {
      res.status(401).send("Invalid signature");
      return;
    }
    throw error;
  }

  res.status(200).send("OK");
});
```

## WebhookEvent Type

```typescript
interface WebhookEvent {
  transactionReference: string;
  resultCode: number;
  remarks: string;
  thirdPartyTransId?: string;     // External provider ID (e.g., M-Pesa receipt)
  amount?: number;
  transactionDate?: string;
  forwardUrl?: string;
  orderId?: string;
  userId?: string;
  customerName?: string;
  success: boolean;
  status?: string;
  phoneNumber?: string;
  web3TransactionReference?: string;

  // Derived fields
  isSuccess: boolean;              // result_code === 0 && success === true
  transactionType: TransactionKind; // Derived from reference suffix

  _raw: Record<string, unknown>;   // Original payload
}
```

## Best Practices

### 1. Respond immediately

Always respond with `200` immediately, then process asynchronously:

```typescript
app.post("/webhook", (req, res) => {
  res.status(200).send("OK"); // Respond first

  // Process in the background
  const event = payd.webhooks.parseEvent(req.body);
  processEvent(event).catch(console.error);
});
```

### 2. Handle duplicates (idempotency)

Payd may send the same webhook multiple times. Use the `transactionReference` as an idempotency key:

```typescript
app.post("/webhook", async (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  // Check if already processed
  const existing = await db.transactions.findByRef(event.transactionReference);
  if (existing) {
    res.status(200).send("OK");
    return;
  }

  // Process the event
  await db.transactions.create({
    ref: event.transactionReference,
    status: event.isSuccess ? "paid" : "failed",
    amount: event.amount,
  });

  res.status(200).send("OK");
});
```

### 3. Access the raw payload

If you need fields not exposed in the typed event, access `_raw`:

```typescript
const event = payd.webhooks.parseEvent(req.body);
const rawData = event._raw;
console.log(rawData.some_custom_field);
```
