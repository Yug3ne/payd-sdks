# Transaction Status

Look up the full details and current status of any Payd transaction using its reference.

## Basic Usage

```typescript
const tx = await payd.transactions.getStatus("9BD103350408eR");

console.log(tx.type);                        // "receipt"
console.log(tx.amount);                      // 10000
console.log(tx.currency);                    // "KES"
console.log(tx.transactionDetails.status);   // "success"
console.log(tx.transactionDetails.channel);  // "MPESA"
console.log(tx.transactionDetails.payer);    // "254700000000"
console.log(tx.createdAt);                   // "2024-01-15T10:30:00Z"
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `transactionReference` | `string` | The Payd transaction reference (e.g., `"9BD103350408eR"`) |

## Response

```typescript
interface TransactionStatusResponse {
  id: string;                      // Transaction UUID
  accountId: string;               // Account UUID
  billingCurrency: string;         // Billing currency code
  currency: string;                // Transaction currency
  code: string;                    // Transaction reference code
  conversionRate: number;          // Currency conversion rate
  amount: number;                  // Transaction amount
  billingCurrencyAmount: number;   // Amount in billing currency
  balance: number;                 // Account balance after transaction
  type: string;                    // "receipt", "withdrawal", "transfer", "topup"
  transactionDetails: TransactionDetails;
  transactionCategory: string;
  userId: string;
  requestMetadata: unknown;
  createdAt: string;               // ISO timestamp
  transactionReference: string;    // Alias for code
  _raw: Record<string, unknown>;
}

interface TransactionDetails {
  payer: string;
  merchantId: string;
  phoneNumber: string;
  processedAt: ProcessedAt;
  reason: string;
  channel: string;
  accountNumber: string;
  status: string;
  receiver: string;
  emailAddress: string;
}

interface ProcessedAt {
  seconds: number;
  nanos: number;
}
```

## Transaction Reference Suffixes

Payd transaction references encode the type in their suffix:

| Suffix | Type | Description |
|--------|------|-------------|
| `eR` | `receipt` | Collection / payin |
| `eW` | `withdrawal` | Payout |
| `eS` | `transfer` | Payd-to-Payd transfer |
| `eT` | `topup` | Account topup |

```typescript
"9BD103350408eR"   // → receipt (collection)
"9BD141203407eW"   // → withdrawal (payout)
"9BD12041887.eS"   // → transfer
```

## Use Cases

### Verify a webhook event

```typescript
// After receiving a webhook, double-check the status
app.post("/webhook", async (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  // Verify with the API
  const tx = await payd.transactions.getStatus(event.transactionReference);

  if (tx.transactionDetails.status === "success") {
    await db.orders.update({ ref: event.transactionReference, status: "paid" });
  }

  res.status(200).send("OK");
});
```

### Build a transaction history page

```typescript
async function getTransactionDetails(reference: string) {
  const tx = await payd.transactions.getStatus(reference);

  return {
    type: tx.type,
    amount: `${tx.amount} ${tx.currency}`,
    status: tx.transactionDetails.status,
    channel: tx.transactionDetails.channel,
    date: tx.createdAt,
    payer: tx.transactionDetails.payer,
    receiver: tx.transactionDetails.receiver,
  };
}
```
