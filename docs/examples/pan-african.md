# Pan-African Payment Flows

Complete examples for collecting and sending payments across African countries.

## Collection Flow (Nigeria — Mobile Money)

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: "my_payd_user",
  defaultCallbackUrl: "https://my-server.com/webhook",
});

async function collectFromNigeria() {
  // Step 1: Discover available collection networks
  const networks = await payd.networks.discover("receipt", "+234");

  console.log("Available mobile networks:");
  for (const net of networks.mobile) {
    console.log(`  ${net.name} (${net.minAmount} - ${net.maxAmount} NGN)`);
  }

  // Step 2: Select a network
  const mtn = networks.findMobile("MTN");

  // Step 3: Collect payment
  const result = await payd.collections.panAfrican({
    username: "",
    ...mtn.toPaymentParams(),
    accountName: "phone",
    amount: 5000,
    phoneNumber: "+2348012345678",
    accountNumber: "+2348012345678",
    narration: "Service subscription",
    currency: "NGN",
    callbackUrl: "",
  });

  console.log(`Reference: ${result.transactionReference}`);
  // Wait for webhook to confirm payment
}
```

## Collection Flow (South Africa — Bank Transfer)

Some countries use a hosted checkout page:

```typescript
async function collectFromSouthAfrica() {
  const networks = await payd.networks.discover("receipt", "+27");

  // Browse bank options
  console.log("Available banks:");
  for (const bank of networks.banks) {
    console.log(`  ${bank.name}`);
  }

  const bank = networks.banks[0]; // or networks.findBank("name")

  const result = await payd.collections.panAfrican({
    username: "",
    ...bank.toPaymentParams(),
    accountName: "bank",
    amount: 250,
    phoneNumber: "+27600000000",
    accountNumber: "1234567890",
    narration: "Online purchase",
    currency: "ZAR",
    callbackUrl: "",
    redirectUrl: "https://my-app.com/payment-complete", // Redirect after checkout
  });

  if (result.checkoutUrl) {
    console.log(`Redirect customer to: ${result.checkoutUrl}`);
  }

  if (result.bankAccount) {
    console.log("Manual bank transfer details:");
    console.log(`  Bank: ${result.bankAccount.name}`);
    console.log(`  Account: ${result.bankAccount.accountNumber}`);
    console.log(`  Name: ${result.bankAccount.accountName}`);
    console.log(`  Reference: ${result.bankAccount.accountReference}`);
  }
}
```

## Payout Flow (Nigeria — Bank)

```typescript
async function payToNigerianBank() {
  // Step 1: Discover withdrawal networks
  const networks = await payd.networks.discover("withdrawal", "+234");

  console.log("Available banks:");
  for (const bank of networks.banks) {
    console.log(`  ${bank.name} (code: ${bank.code})`);
  }

  // Step 2: Select bank
  const opay = networks.findBank("OPay");

  // Step 3: Send payout
  const result = await payd.payouts.panAfrican({
    username: "",
    ...opay.toPaymentParams(),
    accountName: "bank",
    accountHolderName: "John Doe",
    accountNumber: "0123456789",
    amount: 10000,
    phoneNumber: "+2348012345678",
    narration: "Freelancer payment",
    currency: "NGN",
    callbackUrl: "",
  });

  console.log(`Payout initiated: ${result.transactionReference}`);
  // Wait for webhook to confirm delivery
}
```

## Payout Flow (Uganda — Mobile Money)

```typescript
async function payToUgandanMobileMoney() {
  const networks = await payd.networks.discover("withdrawal", "+256");

  // Find MTN Mobile Money
  const mtn = networks.findMobile("MTN");

  const result = await payd.payouts.panAfrican({
    username: "",
    ...mtn.toPaymentParams(),
    accountName: "phone",
    accountHolderName: "Jane Smith",
    accountNumber: "+256700000000",
    amount: 50000,
    phoneNumber: "+256700000000",
    narration: "Salary payment",
    currency: "UGX",
    callbackUrl: "",
  });

  console.log(`Payout initiated: ${result.transactionReference}`);
}
```

## Multi-Country Payment Service

Build a service that handles payments across multiple countries:

```typescript
interface PaymentRequest {
  country: string;      // "NG", "UG", "GH", etc.
  dialCode: string;     // "+234", "+256", "+233"
  currency: string;     // "NGN", "UGX", "GHS"
  amount: number;
  phoneNumber: string;
  networkName?: string; // Optional: specific network preference
}

async function collectPayment(req: PaymentRequest) {
  // 1. Discover networks for the country
  const networks = await payd.networks.discover("receipt", req.dialCode);

  // 2. Find the best network
  let network;
  if (req.networkName) {
    // Try to find the requested network
    try {
      network = networks.findMobile(req.networkName);
    } catch {
      // Fall back to first available
      network = networks.mobile[0];
    }
  } else {
    network = networks.mobile[0]; // Default to first
  }

  if (!network) {
    throw new Error(`No mobile networks available for ${req.dialCode}`);
  }

  // 3. Collect
  const result = await payd.collections.panAfrican({
    username: "",
    ...network.toPaymentParams(),
    accountName: "phone",
    amount: req.amount,
    phoneNumber: req.phoneNumber,
    accountNumber: req.phoneNumber,
    narration: "Payment",
    currency: req.currency,
    callbackUrl: "",
  });

  return {
    reference: result.transactionReference,
    network: network.name,
    country: req.country,
    amount: req.amount,
    currency: req.currency,
  };
}

// Usage:
await collectPayment({
  country: "NG",
  dialCode: "+234",
  currency: "NGN",
  amount: 5000,
  phoneNumber: "+2348012345678",
  networkName: "MTN",
});

await collectPayment({
  country: "UG",
  dialCode: "+256",
  currency: "UGX",
  amount: 20000,
  phoneNumber: "+256700000000",
});

await collectPayment({
  country: "GH",
  dialCode: "+233",
  currency: "GHS",
  amount: 100,
  phoneNumber: "+233200000000",
  networkName: "MTN",
});
```

## Supported Countries Reference

| Country | Dial Code | Currency | Mobile Money | Banks |
|---------|-----------|----------|:---:|:---:|
| Kenya | `+254` | KES | M-Pesa (use Kenya-specific methods) | - |
| Nigeria | `+234` | NGN | Yes | Yes |
| Uganda | `+256` | UGX | Yes | Yes |
| Tanzania | `+255` | TZS | Yes | Yes |
| Ghana | `+233` | GHS | Yes | Yes |
| South Africa | `+27` | ZAR | - | Yes |
| Rwanda | `+250` | RWF | Yes | Yes |
| Zambia | `+260` | ZMW | Yes | Yes |
| Senegal | `+221` | XOF | Yes | Yes |
| Cameroon | `+237` | XAF | Yes | Yes |
| DRC | `+243` | CDF | Yes | - |
| Ethiopia | `+251` | ETB | Yes | Yes |
| Malawi | `+265` | MWK | Yes | - |
| Mozambique | `+258` | MZN | Yes | - |
| Ivory Coast | `+225` | XOF | Yes | Yes |
| Benin | `+229` | XOF | Yes | - |
| Guinea | `+224` | GNF | Yes | - |
| Mali | `+223` | XOF | Yes | - |
| Burkina Faso | `+226` | XOF | Yes | - |
| Togo | `+228` | XOF | Yes | - |
| Niger | `+227` | XOF | Yes | - |
| Congo Republic | `+242` | XAF | Yes | - |

::: tip
Use `payd.networks.discover()` to check real-time availability — not all networks are available in all countries at all times.
:::
