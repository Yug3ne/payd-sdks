# @payd-money/node

Official Payd SDK for Node.js — collect payments, send payouts, and manage transactions across Africa.

## Installation

```bash
npm install @payd-money/node
```

Requires Node.js 18+.

## Quick Start

```typescript
import { PaydClient } from "@payd-money/node";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
});
```

## Collections (Payins)

### Kenya M-Pesa STK Push

```typescript
const result = await payd.collections.mpesa({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "https://example.com/webhook",
});

console.log(result.transactionReference); // "9BD103350408eR"
```

### Card Payments

```typescript
const result = await payd.collections.card({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "https://example.com/webhook",
});

// Redirect customer to hosted checkout
window.location.href = result.checkoutUrl;
```

### Pan-African Collections

```typescript
// Step 1: Discover available networks
const networks = await payd.networks.discover("receipt", "+234");
const opay = networks.findMobile("OPay");

// Step 2: Collect payment
const result = await payd.collections.panAfrican({
  username: "my_payd_user",
  ...opay.toPaymentParams(),
  accountName: "phone",
  amount: 1800,
  phoneNumber: "+2340000000000",
  accountNumber: "+2340000000000",
  narration: "Order #1234",
  currency: "NGN",
  callbackUrl: "https://example.com/webhook",
});
```

## Payouts

### Kenya M-Pesa

```typescript
const result = await payd.payouts.mpesa({
  phoneNumber: "0700000000",
  amount: 500,
  narration: "Salary payment",
  callbackUrl: "https://example.com/webhook",
});
```

### Pan-African Payouts

```typescript
const networks = await payd.networks.discover("withdrawal", "+234");
const opay = networks.findBank("OPay");

const result = await payd.payouts.panAfrican({
  username: "my_payd_user",
  ...opay.toPaymentParams(),
  accountName: "bank",
  accountHolderName: "John Doe",
  accountNumber: "0000000000",
  amount: 1800,
  phoneNumber: "+2340000000000",
  narration: "Payment for services",
  currency: "NGN",
  callbackUrl: "https://example.com/webhook",
});
```

### Merchant Payouts (Paybill/Till)

```typescript
const result = await payd.payouts.merchant({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "+254700000000",
  narration: "Utility bill",
  businessAccount: "123456",
  businessNumber: "9876543210",
  callbackUrl: "https://example.com/webhook",
});
```

## Transfers

```typescript
const result = await payd.transfers.send({
  receiverUsername: "recipient_user",
  amount: 100,
  narration: "Lunch money",
  phoneNumber: "+254700000000",
});
```

## Resources

### Account Balances

```typescript
const balances = await payd.balances.getAll("my_payd_user");
console.log(balances.fiatBalance);    // { balance: 1000.00, currency: "KES" }
console.log(balances.onchainBalance); // { balance: 500, currency: "USD" }
```

### Transaction Status

```typescript
const tx = await payd.transactions.getStatus("9BD103350408eR");
console.log(tx.type);                     // "receipt"
console.log(tx.transactionDetails.status); // "success"
```

### Network Discovery

```typescript
const networks = await payd.networks.discover("receipt", "+234");

// Browse available networks
console.log(networks.mobile); // Mobile money networks
console.log(networks.banks);  // Bank networks

// Find a specific network
const mtn = networks.findMobile("MTN");
console.log(mtn.minAmount, mtn.maxAmount);

// Get params for a payment request
const params = mtn.toPaymentParams();
// { networkCode, channelId, transactionChannel, providerName, providerCode }
```

## Webhooks

### Parse webhook events

```typescript
app.post("/webhook", (req, res) => {
  const event = payd.webhooks.parseEvent(req.body);

  if (event.isSuccess) {
    console.log(`Payment ${event.transactionReference} succeeded!`);
    console.log(`Type: ${event.transactionType}`); // "receipt", "withdrawal", etc.
    console.log(`Amount: ${event.amount}`);
  } else {
    console.log(`Payment failed: ${event.remarks}`);
  }

  // Always respond 200 immediately
  res.status(200).send("OK");
});
```

### Verify webhook signatures

```typescript
// If using Payd Connect webhook signing
const event = payd.webhooks.constructEvent(
  rawBody,                          // raw JSON string
  req.headers["x-payd-connect-signature"],
  process.env.WEBHOOK_SECRET!,
);
```

## Client Options

```typescript
const payd = new PaydClient({
  apiUsername: "your_api_username",
  apiPassword: "your_api_password",

  // Optional defaults
  baseUrl: "https://api.payd.money",  // Custom base URL
  timeout: 30000,                      // Request timeout (ms)
  walletType: "local",                 // Default wallet: "local" or "USD"
  defaultCallbackUrl: "https://...",   // Default webhook URL
  defaultUsername: "my_payd_user",     // Default Payd username
  debug: false,                        // Log requests/responses
  maxRetries: 2,                       // Retries for transient errors
});
```

## Error Handling

```typescript
import {
  PaydError,
  PaydValidationError,
  PaydAPIError,
  PaydAuthenticationError,
  PaydNetworkError,
} from "@payd-money/node";

try {
  await payd.collections.mpesa({ ... });
} catch (error) {
  if (error instanceof PaydValidationError) {
    // Client-side validation failed (bad phone, amount out of range, etc.)
    console.log(error.message); // "phoneNumber must be 10 digits starting with 0"
    console.log(error.field);   // "phoneNumber"
  } else if (error instanceof PaydAuthenticationError) {
    // Invalid API credentials (401)
  } else if (error instanceof PaydAPIError) {
    // API returned an error (non-2xx or success: false)
    console.log(error.statusCode); // 400
    console.log(error.message);    // "number (123) is not valid kenyan number"
    console.log(error.detail);     // Raw API response body
  } else if (error instanceof PaydNetworkError) {
    // Connection failure, timeout, etc.
  }
}
```

## Supported Countries

Kenya (KES), Uganda (UGX), Rwanda (RWF), Tanzania (TZS), Ghana (GHS), Nigeria (NGN), South Africa (ZAR), and 13 more African countries.

## License

MIT
