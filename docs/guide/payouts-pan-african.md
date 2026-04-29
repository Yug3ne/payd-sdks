# Pan-African Payout

Send money to mobile wallets and bank accounts across 23+ African countries. Like Pan-African collections, this is a **two-step flow**: discover available networks, then send the payout.

## How It Works

1. Call `payd.networks.discover("withdrawal", dialCode)` to get available payout networks
2. Pick a network and call `.toPaymentParams()` to get the required fields
3. Call `payd.payouts.panAfrican()` with the network params and recipient details

## Step-by-Step

### Step 1: Discover Withdrawal Networks

```typescript
// Discover payout networks for Nigeria
const networks = await payd.networks.discover("withdrawal", "+234");
```

::: warning Note the transaction type
Use `"withdrawal"` (not `"receipt"`) when discovering networks for payouts. Available networks may differ between collections and payouts.
:::

### Step 2: Pick a Network

```typescript
// Find OPay bank by name
const opay = networks.findBank("OPay");

// Or find a mobile money network
const mtn = networks.findMobile("MTN");
```

### Step 3: Send the Payout

```typescript
const result = await payd.payouts.panAfrican({
  username: "my_payd_user",
  ...opay.toPaymentParams(),     // networkCode, channelId, providerName, etc.
  accountName: "bank",            // "bank" or "phone"
  accountHolderName: "John Doe",  // Recipient's name
  accountNumber: "0000000000",    // Bank account or mobile money number
  amount: 1800,
  phoneNumber: "+2340000000000",
  narration: "Freelancer payment",
  currency: "NGN",
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.transactionReference);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | Yes* | Your Payd account username |
| `networkCode` | `string` | Yes | Network ID from `networks.discover()` |
| `accountName` | `"bank" \| "phone"` | Yes | `"bank"` for bank, `"phone"` for mobile money |
| `accountHolderName` | `string` | Yes | Recipient's full name |
| `accountNumber` | `string` | Yes | Bank account or mobile money number |
| `amount` | `number` | Yes | Amount in target currency (must be > 0) |
| `phoneNumber` | `string` | Yes | Recipient's phone with country code (e.g., `+2340000000000`) |
| `channelId` | `string` | Yes | Channel ID from `networks.discover()` |
| `narration` | `string` | Yes | Description of the payout |
| `currency` | `string` | Yes | ISO currency code (e.g., `NGN`, `GHS`, `ZAR`) |
| `callbackUrl` | `string` | Yes* | Webhook URL for transaction result |
| `transactionChannel` | `"bank" \| "phone"` | Yes | Must match network type |
| `providerName` | `string` | Yes | Provider name from network discovery |
| `providerCode` | `string` | Yes | Provider code from network discovery |
| `walletType` | `"local" \| "USD"` | No | Which wallet to fund from (default: `"local"`) |

*Falls back to client defaults if empty.

## Response

```typescript
interface PanAfricanPayoutResponse {
  success: boolean;
  message: string;
  status: string;
  transactionReference: string;
  channel: string;
  amount: number;
  _raw: Record<string, unknown>;
}
```

## Complete Example

```typescript
async function payToNigeria(recipientName: string, accountNumber: string, amount: number) {
  // 1. Discover withdrawal networks for Nigeria
  const networks = await payd.networks.discover("withdrawal", "+234");

  // 2. Find OPay
  const opay = networks.findBank("OPay");

  // 3. Send payout
  const result = await payd.payouts.panAfrican({
    username: "",
    ...opay.toPaymentParams(),
    accountName: "bank",
    accountHolderName: recipientName,
    accountNumber: accountNumber,
    amount,
    phoneNumber: `+234${accountNumber}`,
    narration: "Payment for services",
    currency: "NGN",
    callbackUrl: "",
  });

  return result.transactionReference;
}
```
