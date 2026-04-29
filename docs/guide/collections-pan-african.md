# Pan-African Collection

Collect payments via mobile money and bank transfer across 23+ African countries. This is a **two-step flow**: first discover available networks for the target country, then make the collection.

## How It Works

1. Call `payd.networks.discover("receipt", dialCode)` to get available networks
2. Pick a network and call `.toPaymentParams()` to get the required fields
3. Call `payd.collections.panAfrican()` with the network params and transaction details
4. Payd sends a webhook to your `callbackUrl` with the result

## Step-by-Step

### Step 1: Discover Networks

```typescript
const networks = await payd.networks.discover("receipt", "+234"); // Nigeria

// Browse available networks
console.log("Mobile networks:");
for (const net of networks.mobile) {
  console.log(`  ${net.name} (${net.minAmount} - ${net.maxAmount})`);
}

console.log("Bank networks:");
for (const net of networks.banks) {
  console.log(`  ${net.name}`);
}
```

### Step 2: Pick a Network

```typescript
// Option A: Find by name (case-insensitive partial match)
const mtn = networks.findMobile("MTN");
const opay = networks.findBank("OPay");

// Option B: Use the first available
const network = networks.mobile[0];
```

### Step 3: Collect Payment

```typescript
const result = await payd.collections.panAfrican({
  username: "my_payd_user",
  ...mtn.toPaymentParams(),    // Spreads networkCode, channelId, etc.
  accountName: "phone",         // "phone" for mobile money, "bank" for bank
  amount: 1800,
  phoneNumber: "+2340000000000",
  accountNumber: "+2340000000000",
  narration: "Order payment",
  currency: "NGN",
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.transactionReference);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | Yes* | Your Payd account username |
| `accountName` | `"bank" \| "phone"` | Yes | `"phone"` for mobile money, `"bank"` for bank transfer |
| `amount` | `number` | Yes | Amount in the target currency (must be > 0) |
| `phoneNumber` | `string` | Yes | Payer's phone number with country code (e.g., `+2340000000000`) |
| `accountNumber` | `string` | Yes | Mobile money number (with `+` prefix) or bank account number |
| `networkCode` | `string` | Yes | Network ID from `networks.discover()` |
| `channelId` | `string` | Yes | Channel ID from `networks.discover()` |
| `narration` | `string` | Yes | Payment description |
| `currency` | `string` | Yes | ISO currency code (e.g., `NGN`, `GHS`, `ZAR`) |
| `callbackUrl` | `string` | Yes* | Webhook URL for transaction result |
| `transactionChannel` | `"bank" \| "phone"` | Yes | Must match the network type |
| `redirectUrl` | `string` | No | Redirect URL for hosted checkout flows (e.g., South Africa) |

*Falls back to client defaults if empty.

::: tip Use `toPaymentParams()`
The `networkCode`, `channelId`, and `transactionChannel` fields all come from the network discovery response. The easiest way to get them is to call `.toPaymentParams()` on a network and spread the result:

```typescript
const params = network.toPaymentParams();
// Returns: { networkCode, channelId, transactionChannel, providerName, providerCode }
```
:::

## Response

```typescript
interface PanAfricanCollectionResponse {
  success: boolean;
  message: string;
  status: string;
  paymentMethod: string;
  transactionReference: string;
  bankAccount?: BankAccount;     // Present for bank transfer responses
  checkoutUrl?: string;          // Present for hosted checkout flows
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}

interface BankAccount {
  name: string;
  branchCode: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
}
```

## Response Variations

Different countries and payment methods return different response shapes:

### Mobile Money (e.g., Nigeria, Uganda, Ghana)

The customer receives a push notification or USSD prompt to confirm payment:

```typescript
const result = await payd.collections.panAfrican({
  ...network.toPaymentParams(),
  accountName: "phone",
  // ...
});

console.log(result.transactionReference);
// Wait for webhook confirmation
```

### Bank Transfer (e.g., some Nigerian banks)

The API may return bank account details for the customer to transfer to:

```typescript
if (result.bankAccount) {
  console.log(`Transfer to: ${result.bankAccount.name}`);
  console.log(`Account: ${result.bankAccount.accountNumber}`);
  console.log(`Reference: ${result.bankAccount.accountReference}`);
}
```

### Hosted Checkout (e.g., South Africa)

Some countries use a hosted checkout page. Pass `redirectUrl` for post-payment redirect:

```typescript
const result = await payd.collections.panAfrican({
  ...network.toPaymentParams(),
  accountName: "bank",
  redirectUrl: "https://my-app.com/payment-complete",
  // ...
});

if (result.checkoutUrl) {
  // Redirect customer to hosted checkout
  res.redirect(result.checkoutUrl);
}
```

## Complete Example

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: "my_payd_user",
  defaultCallbackUrl: "https://my-server.com/webhook",
});

async function collectFromNigeria(amount: number, phone: string) {
  // 1. Discover networks
  const networks = await payd.networks.discover("receipt", "+234");

  // 2. Find OPay mobile money
  const opay = networks.findMobile("OPay");

  // 3. Collect
  const result = await payd.collections.panAfrican({
    username: "",
    ...opay.toPaymentParams(),
    accountName: "phone",
    amount,
    phoneNumber: phone,
    accountNumber: phone,
    narration: "Order payment",
    currency: "NGN",
    callbackUrl: "",
  });

  return result.transactionReference;
}
```

## Supported Countries

See the [home page](/) for a full list of supported countries and currencies.
