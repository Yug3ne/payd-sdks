# M-Pesa Payout

Send money directly to a Safaricom M-Pesa user in Kenya. Funds are delivered to the recipient's M-Pesa wallet instantly.

## Basic Usage

```typescript
const result = await payd.payouts.mpesa({
  phoneNumber: "0700000000",
  amount: 500,
  narration: "Salary payment",
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.transactionReference); // "9BD141203407eW"
console.log(result.status);              // "queued"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | `string` | Yes | Recipient's Kenyan phone number (10 digits, starting with 0) |
| `amount` | `number` | Yes | Amount in KES (min: 10, max: 250,000) |
| `narration` | `string` | Yes | Description of the payout |
| `callbackUrl` | `string` | Yes* | Webhook URL for transaction result |
| `walletType` | `"local" \| "USD"` | No | Which wallet to fund the payout from (default: `"local"`) |

*Falls back to client defaults if empty.

## Response

```typescript
interface MpesaPayoutResponse {
  success: boolean;
  message: string;
  status: string;
  transactionReference: string;
  channel: string;       // "MPESA"
  amount: number;
  _raw: Record<string, unknown>;
}
```

## Phone Number Normalization

Just like M-Pesa collections, the SDK normalizes phone numbers automatically:

```typescript
// Both work:
await payd.payouts.mpesa({ phoneNumber: "0700000000", /* ... */ });
await payd.payouts.mpesa({ phoneNumber: "+254700000000", /* ... */ });
// +254700000000 is auto-converted to 0700000000
```

## Funding from USD Wallet

By default, payouts are funded from your KES (local) wallet. To use the USD wallet:

```typescript
const result = await payd.payouts.mpesa({
  phoneNumber: "0700000000",
  amount: 500,              // Still specified in KES
  narration: "USD payout",
  callbackUrl: "",
  walletType: "USD",        // Deducted from USD wallet at current rate
});
```

## Complete Example

```typescript
async function processPayout(recipientPhone: string, amount: number) {
  try {
    const result = await payd.payouts.mpesa({
      phoneNumber: recipientPhone,
      amount,
      narration: `Payout ${Date.now()}`,
      callbackUrl: "",
    });

    console.log(`Payout initiated: ${result.transactionReference}`);
    return { success: true, reference: result.transactionReference };
  } catch (error) {
    if (error instanceof PaydValidationError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}
```
