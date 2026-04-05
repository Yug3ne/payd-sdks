# Payd SDKs

Official SDKs for the [Payd](https://payd.money) payments API — collect payments, send payouts, and manage transactions across Africa.

## Packages

| Package | Language | Status | Install |
|---------|----------|--------|---------|
| [`@payd-money/node`](./node) | TypeScript / Node.js | Stable | `npm install @payd-money/node` |

## Repository Structure

```
payd-sdks/
  shared/
    fixtures/          # Canonical JSON request/response examples (used by all SDKs and tests)
  node/                # TypeScript/Node.js SDK
    src/               # Source code
    tests/             # Unit tests (101 tests)
    examples/          # Runnable usage examples
  test-app/            # Interactive test dashboard (Express + vanilla HTML)
```

## Quick Start

### Node.js SDK

```bash
npm install @payd-money/node
```

```typescript
import { PaydClient } from "@payd-money/node";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
});

// Collect via M-Pesa
const result = await payd.collections.mpesa({
  username: "my_payd_user",
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "https://example.com/webhook",
});

console.log(result.transactionReference);
```

See the full [Node.js SDK README](./node/README.md) for all operations.

### Test App

```bash
cd test-app
cp .env.example .env   # fill in your credentials
npm install
npm start              # opens at http://localhost:3456
```

The test app provides a web dashboard where you can test every SDK operation interactively, view live webhook events, and run an automated regression test suite.

## Supported Operations

| Category | Operation | Endpoint |
|----------|-----------|----------|
| **Collections** | Kenya M-Pesa STK Push | `POST /api/v2/payments` |
| **Collections** | Card Payments (hosted checkout) | `POST /api/v2/payments` |
| **Collections** | Pan-African (mobile money + bank) | `POST /api/v3/payments` |
| **Payouts** | Kenya M-Pesa | `POST /api/v2/withdrawal` |
| **Payouts** | Pan-African (mobile + bank) | `POST /api/v2/payments` |
| **Payouts** | Merchant (Paybill/Till) | `POST /api/v3/withdrawal` |
| **Transfers** | Payd-to-Payd | `POST /api/v2/remittance` |
| **Resources** | Account Balances | `GET /api/v1/accounts/{user}/all_balances` |
| **Resources** | Transaction Status | `GET /api/v1/status/{ref}` |
| **Resources** | Network Discovery | `GET /v2/networks/grouped` |

## Supported Countries

Kenya (KES), Uganda (UGX), Rwanda (RWF), Tanzania (TZS), Ghana (GHS), Nigeria (NGN), South Africa (ZAR), Zambia (ZMW), Malawi (MWK), Botswana (BWP), and 10 more West/Central African countries.

## Contributing

See [CONTEXT.md](./CONTEXT.md) for architecture details and guidelines on adding new language SDKs.

## License

[MIT](./LICENSE)
