# Merchant Payout (Paybill / Till)

Pay to M-Pesa Paybill numbers and Till numbers in Kenya. Use this for utility bills, rent payments, or any merchant that accepts M-Pesa business payments.

## Paybill vs Till

| Type | `businessAccount` | `businessNumber` |
|------|-------------------|-------------------|
| **Paybill** | The Paybill number (e.g., `"888880"`) | The account number (e.g., `"12345678"`) |
| **Till** | The Till number (e.g., `"654321"`) | Set to `"N/A"` (not used) |

## Pay a Paybill

```typescript
const result = await payd.payouts.merchant({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "+254700000000",
  narration: "Electricity bill payment",
  businessAccount: "888880",     // Paybill number
  businessNumber: "12345678",    // Account number
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.transactionReference);
```

## Pay a Till

```typescript
const result = await payd.payouts.merchant({
  username: "my_payd_user",
  amount: 200,
  phoneNumber: "+254700000000",
  narration: "Store purchase",
  businessAccount: "654321",     // Till number
  businessNumber: "N/A",         // Not needed for Till
  callbackUrl: "https://my-server.com/webhook",
});
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | Yes* | Your Payd account username |
| `amount` | `number` | Yes | Amount in KES (must be > 0) |
| `phoneNumber` | `string` | Yes | Sender's phone with country code (e.g., `+254700000000`) |
| `narration` | `string` | Yes | Description of the payment |
| `businessAccount` | `string` | Yes | Paybill or Till number |
| `businessNumber` | `string` | Yes | Account number (Paybill) or `"N/A"` (Till) |
| `callbackUrl` | `string` | Yes* | Webhook URL for transaction result |
| `walletType` | `"local" \| "USD"` | No | Which wallet to fund from (default: `"local"`) |

*Falls back to client defaults if empty.

## Response

```typescript
interface MerchantPayoutResponse {
  success: boolean;
  message: string;
  status: string;
  transactionReference: string;
  channel: string;
  amount: number;
  _raw: Record<string, unknown>;
}
```

::: info Phone Number Format
Unlike Kenya M-Pesa collections/payouts, merchant payouts expect an **international format** phone number starting with `+` (e.g., `+254700000000`).
:::
