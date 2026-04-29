# M-Pesa STK Push Collection

Collect payments from Kenyan customers via Safaricom M-Pesa STK Push. When you call this method, the customer receives a push notification on their phone to confirm the payment.

## How It Works

1. You call `payd.collections.mpesa()` with the customer's phone number and amount
2. An STK Push prompt appears on the customer's phone
3. The customer enters their M-Pesa PIN to confirm
4. Payd sends a webhook to your `callbackUrl` with the result

## Basic Usage

```typescript
const result = await payd.collections.mpesa({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.transactionReference); // "9BD103350408eR"
console.log(result.success);             // true
console.log(result.message);             // "STK push sent"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | Yes* | Your Payd account username |
| `amount` | `number` | Yes | Amount in KES (min: 10, max: 250,000) |
| `phoneNumber` | `string` | Yes | Customer's Kenyan phone number |
| `narration` | `string` | Yes | Description shown to the customer |
| `callbackUrl` | `string` | Yes* | Webhook URL for transaction result |

*Falls back to client defaults if empty. See [Configuration](/guide/configuration).

## Response

```typescript
interface MpesaCollectionResponse {
  success: boolean;          // Whether the STK push was initiated
  message: string;           // API message
  status: string;            // Status string
  paymentMethod: string;     // "MPESA"
  transactionReference: string; // Unique reference for this transaction
  trackingId: string;        // Tracking identifier
  reference: string;         // Additional reference
  result: unknown;           // Additional result data
  _raw: Record<string, unknown>; // Raw API response
}
```

## Phone Number Handling

The SDK accepts Kenyan phone numbers in two formats and normalizes automatically:

```typescript
// Both of these work:
await payd.collections.mpesa({
  phoneNumber: "0700000000",      // Local format (preferred)
  // ...
});

await payd.collections.mpesa({
  phoneNumber: "+254700000000",   // International format (auto-normalized)
  // ...
});
```

**Normalization rule:** `+254XXXXXXXXX` (13 chars) is automatically converted to `0XXXXXXXXX` (10 digits).

::: info Validation Rules
- Must be exactly 10 digits after normalization
- Must start with `0`
- Example valid numbers: `0700000000`, `0712345678`, `0110000000`
:::

## Amount Limits

| Limit | Value |
|-------|-------|
| Minimum | KES 10 |
| Maximum | KES 250,000 |

Amounts outside this range throw a `PaydValidationError` before any API call is made:

```typescript
try {
  await payd.collections.mpesa({ amount: 5, /* ... */ });
} catch (e) {
  // PaydValidationError: "amount must be at least 10 for M-Pesa transactions. Got: 5"
  console.log(e.field); // "amount"
}
```

## Using Client Defaults

If you configured `defaultUsername` and `defaultCallbackUrl` on the client, you can omit them from requests:

```typescript
const payd = new PaydClient({
  apiUsername: "...",
  apiPassword: "...",
  defaultUsername: "my_payd_user",
  defaultCallbackUrl: "https://my-server.com/webhook",
});

// username and callbackUrl fall back to defaults
const result = await payd.collections.mpesa({
  username: "",      // uses "my_payd_user"
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "",   // uses "https://my-server.com/webhook"
});
```

## Handling the Webhook

After the customer confirms (or rejects) the STK push, Payd sends a webhook to your callback URL:

```typescript
app.post("/webhook", (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  if (event.isSuccess) {
    // Payment confirmed
    console.log(`Received KES ${event.amount} from ${event.phoneNumber}`);
    console.log(`M-Pesa receipt: ${event.thirdPartyTransId}`);
  } else {
    // Payment failed or was cancelled
    console.log(`Payment failed: ${event.remarks}`);
  }

  // Always respond 200 immediately
  res.status(200).send("OK");
});
```

See the [Webhooks guide](/guide/webhooks) for more details.

## Complete Example

```typescript
import { PaydClient, PaydValidationError, PaydAPIError } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: process.env.PAYD_USERNAME!,
  defaultCallbackUrl: "https://my-server.com/webhook",
});

async function collectPayment(orderId: string, amount: number, phone: string) {
  try {
    const result = await payd.collections.mpesa({
      username: "",
      amount,
      phoneNumber: phone,
      narration: `Payment for order ${orderId}`,
      callbackUrl: "",
    });

    // Store the reference to match with webhook later
    await db.orders.update(orderId, {
      transactionReference: result.transactionReference,
      status: "pending",
    });

    return { success: true, reference: result.transactionReference };
  } catch (error) {
    if (error instanceof PaydValidationError) {
      return { success: false, error: error.message, field: error.field };
    }
    if (error instanceof PaydAPIError) {
      return { success: false, error: error.message, code: error.statusCode };
    }
    throw error;
  }
}
```
