---
layout: home
hero:
  name: Payd Node SDK
  text: Payments across Africa, simplified.
  tagline: Collect via M-Pesa, cards, and mobile money. Send payouts to 23+ countries. All from a single, type-safe Node.js SDK.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/client
    - theme: alt
      text: View on GitHub
      link: https://github.com/Yug3ne/payd-sdks
features:
  - icon: "\U0001F4F1"
    title: M-Pesa STK Push
    details: Trigger M-Pesa STK push prompts on customer phones. Collect payments in Kenya with a single method call.
  - icon: "\U0001F4B3"
    title: Card Payments
    details: Accept Visa and Mastercard via hosted checkout. Get a secure URL and redirect your customer — done.
  - icon: "\U0001F30D"
    title: Pan-African Coverage
    details: Collect and send money across 23+ African countries via mobile money and bank transfer. Nigeria, Uganda, Ghana, Tanzania, South Africa, and more.
  - icon: "\U0001F4B8"
    title: Payouts & Transfers
    details: Send money to M-Pesa users, bank accounts, Paybill/Till merchants, or other Payd accounts instantly.
  - icon: "\U0001F527"
    title: Type-Safe & Zero Dependencies
    details: Full TypeScript types for every request and response. Zero runtime dependencies — just the Node.js runtime.
  - icon: "\U0001F6E1️"
    title: Built-in Validation
    details: Client-side validation catches bad phone numbers, out-of-range amounts, and missing fields before the request leaves your server.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #10b981, #059669);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #10b98150 50%, #06b6d450 50%);
  --vp-home-hero-image-filter: blur(44px);
}
</style>

## Quick Example

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
});

// Collect KES 500 via M-Pesa
const result = await payd.collections.mpesa({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "https://my-server.com/webhook",
});

console.log(result.transactionReference); // "9BD103350408eR"
```

## Supported Countries

| Region | Countries |
|--------|-----------|
| East Africa | Kenya, Uganda, Tanzania, Rwanda, Ethiopia |
| West Africa | Nigeria, Ghana, Senegal, Cameroon, Ivory Coast, Benin, Guinea, Mali, Burkina Faso, Togo, Niger |
| Southern Africa | South Africa, Zambia, Malawi, Mozambique |
| Central Africa | DRC, Congo Republic |
