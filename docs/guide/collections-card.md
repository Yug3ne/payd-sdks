# Card Payment Collection

Accept Visa and Mastercard payments via Payd's hosted checkout page. The SDK initiates the transaction and returns a `checkoutUrl` — redirect the customer there to complete payment.

## How It Works

1. You call `payd.collections.card()` with the transaction details
2. The API returns a `checkoutUrl` — a secure, hosted payment page
3. You redirect the customer to the `checkoutUrl`
4. The customer enters their card details and completes payment
5. Payd sends a webhook to your `callbackUrl` with the result

## Basic Usage

```typescript
const result = await payd.collections.card({
  username: "my_payd_user",
  amount: 1500,
  phoneNumber: "0700000000",
  narration: "Premium subscription",
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.checkoutUrl);
// => "https://checkout.payd.money/pay/abc123..."

// Redirect customer to this URL
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | Yes* | Your Payd account username |
| `amount` | `number` | Yes | Amount in KES (minimum: 100) |
| `phoneNumber` | `string` | Yes | Customer's Kenyan phone number (10 digits, starting with 0) |
| `narration` | `string` | Yes | Description of the payment |
| `callbackUrl` | `string` | Yes* | Webhook URL for transaction result |

*Falls back to client defaults if empty.

## Response

```typescript
interface CardCollectionResponse {
  success: boolean;
  message: string;
  status: string;
  paymentMethod: string;         // "card"
  checkoutUrl: string;           // Hosted checkout URL - redirect customer here
  transactionReference: string;  // Unique reference for this transaction
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```

::: warning Important
The `checkoutUrl` field is required in card responses. If the API returns a response without a checkout URL, the SDK throws a `PaydAPIError` — this typically indicates a configuration issue with your Payd account.
:::

## Amount Limits

| Limit | Value |
|-------|-------|
| Minimum | KES 100 |
| Maximum | No enforced maximum |

```typescript
try {
  await payd.collections.card({ amount: 50, /* ... */ });
} catch (e) {
  // PaydValidationError: "amount must be at least 100 KES for card payments. Got: 50"
}
```

## Web Integration Example

### Express + Server-Side Redirect

```typescript
app.post("/pay", async (req, res) => {
  const { orderId, amount } = req.body;

  const result = await payd.collections.card({
    username: "",
    amount,
    phoneNumber: "0700000000",
    narration: `Order #${orderId}`,
    callbackUrl: "",
  });

  // Store reference, then redirect
  await db.orders.update(orderId, {
    transactionReference: result.transactionReference,
  });

  res.redirect(result.checkoutUrl);
});
```

### React / Next.js — Client-Side Redirect

```typescript
// API route: POST /api/create-checkout
export async function POST(req: Request) {
  const { orderId, amount, phone } = await req.json();

  const result = await payd.collections.card({
    username: "",
    amount,
    phoneNumber: phone,
    narration: `Order #${orderId}`,
    callbackUrl: "",
  });

  return Response.json({ checkoutUrl: result.checkoutUrl });
}

// Client component:
const res = await fetch("/api/create-checkout", {
  method: "POST",
  body: JSON.stringify({ orderId, amount, phone }),
});
const { checkoutUrl } = await res.json();
window.location.href = checkoutUrl;
```

## Handling the Webhook

After the customer completes (or abandons) the card payment, Payd sends a webhook:

```typescript
app.post("/webhook", (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  if (event.isSuccess) {
    console.log(`Card payment of KES ${event.amount} succeeded`);
    console.log(`Reference: ${event.transactionReference}`);
  } else {
    console.log(`Card payment failed: ${event.remarks}`);
  }

  res.status(200).send("OK");
});
```
