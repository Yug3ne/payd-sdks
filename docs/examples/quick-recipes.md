# Quick Recipes

Copy-paste examples for common tasks. All examples assume you have a configured client:

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: process.env.PAYD_USERNAME!,
  defaultCallbackUrl: "https://my-server.com/webhook",
});
```

## Collect via M-Pesa

```typescript
const result = await payd.collections.mpesa({
  username: "",
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "",
});

console.log(result.transactionReference);
```

## Collect via Card

```typescript
const result = await payd.collections.card({
  username: "",
  amount: 1500,
  phoneNumber: "0700000000",
  narration: "Premium plan",
  callbackUrl: "",
});

// Redirect customer to hosted checkout
res.redirect(result.checkoutUrl);
```

## Collect from Nigeria (Pan-African)

```typescript
const networks = await payd.networks.discover("receipt", "+234");
const mtn = networks.findMobile("MTN");

const result = await payd.collections.panAfrican({
  username: "",
  ...mtn.toPaymentParams(),
  accountName: "phone",
  amount: 5000,
  phoneNumber: "+2348012345678",
  accountNumber: "+2348012345678",
  narration: "Service fee",
  currency: "NGN",
  callbackUrl: "",
});
```

## Send M-Pesa Payout

```typescript
const result = await payd.payouts.mpesa({
  phoneNumber: "0700000000",
  amount: 1000,
  narration: "Salary",
  callbackUrl: "",
});
```

## Pay to Paybill

```typescript
const result = await payd.payouts.merchant({
  username: "",
  amount: 2500,
  phoneNumber: "+254700000000",
  narration: "Electricity bill",
  businessAccount: "888880",
  businessNumber: "ACC123",
  callbackUrl: "",
});
```

## Transfer Between Payd Accounts

```typescript
const result = await payd.transfers.send({
  receiverUsername: "friend",
  amount: 200,
  narration: "Lunch money",
  phoneNumber: "+254700000000",
});
// Transfers are instant
```

## Check Balance

```typescript
const balances = await payd.balances.getAll();
console.log(`KES: ${balances.fiatBalance.balance}`);
console.log(`USD: ${balances.onchainBalance.balance}`);
```

## Look Up Transaction

```typescript
const tx = await payd.transactions.getStatus("9BD103350408eR");
console.log(`Status: ${tx.transactionDetails.status}`);
console.log(`Amount: ${tx.amount} ${tx.currency}`);
```

## Parse a Webhook

```typescript
const event = payd.webhooks.parseEvent(req.body);

if (event.isSuccess) {
  console.log(`Success: ${event.transactionReference}`);
  console.log(`Amount: ${event.amount}`);
  console.log(`Type: ${event.transactionType}`);
} else {
  console.log(`Failed: ${event.remarks}`);
}
```

## Verify + Parse a Webhook

```typescript
const event = payd.webhooks.constructEvent(
  req.body,                                          // Raw body string
  req.headers["x-payd-connect-signature"] as string, // Signature header
  process.env.WEBHOOK_SECRET!,                       // Your secret
);
```

## Error Handling

```typescript
import { PaydValidationError, PaydAPIError, PaydNetworkError } from "payd-node-sdk";

try {
  await payd.collections.mpesa({ /* ... */ });
} catch (error) {
  if (error instanceof PaydValidationError) {
    console.log(`Bad input: ${error.message} (field: ${error.field})`);
  } else if (error instanceof PaydAPIError) {
    console.log(`API error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof PaydNetworkError) {
    console.log(`Network error: ${error.message}`);
  }
}
```
