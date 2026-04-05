# Payd SDKs

Official SDKs for the [Payd](https://payd.money) payments API — collect payments, send payouts, and manage transactions across Africa.

## Packages

| Package | Language | Status | Install |
|---------|----------|--------|---------|
| [`payd-node-sdk`](./node) | TypeScript / Node.js | Stable | `npm install payd-node-sdk` |

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
npm install payd-node-sdk
```

```typescript
import { PaydClient } from "payd-node-sdk";

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

## Local Testing (before npm publish)

If you're testing the SDK locally — either contributing or trying it out before it's on npm — follow these steps.

### Prerequisites

- Node.js 18+
- Git
- Payd API credentials (get them from [app.payd.money](https://app.payd.money))

### 1. Clone and build the SDK

```bash
git clone https://github.com/Yug3ne/payd-sdks.git
cd payd-sdks/node
npm install
npm run build        # compiles TypeScript → dist/
npm test             # runs 101 unit tests to verify everything works
```

### 2. Run the interactive test dashboard

The test app lets you test every SDK operation from a web UI.

```bash
cd ../test-app
npm install
npm start
```

Open **http://localhost:3456** in your browser. You'll see:

1. **Configuration panel** — enter your Payd API credentials (API Username, API Password, Payd Username)
2. **Operation panels** — expand any panel, fill in params, click "Execute"
3. **Live Webhook sidebar** — shows webhook events in real time
4. **"Run All Tests" button** — runs an automated regression suite

> **Tip:** The callback URL is pre-set to `http://localhost:3456/api/webhooks/receive`. If you're testing webhooks from the live Payd API, you'll need to expose this URL using a tool like [ngrok](https://ngrok.com): `ngrok http 3456`

### 3. Use the SDK in your own project (local link)

If you want to import the SDK into another project without publishing to npm:

```bash
# Option A: Install directly from the local path
cd /path/to/your-project
npm install /path/to/payd-sdks/node

# Option B: Use npm link
cd /path/to/payd-sdks/node
npm link
cd /path/to/your-project
npm link payd-node-sdk
```

Then use it normally:

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
});

const balances = await payd.balances.getAll("your_payd_username");
console.log(balances.fiatBalance); // { balance: 1000, currency: "KES" }
```

### 4. Run the examples file

```bash
cd /path/to/payd-sdks/node

# Set your credentials
export PAYD_API_USERNAME="your_api_username"
export PAYD_API_PASSWORD="your_api_password"
export PAYD_USERNAME="your_payd_username"

# Run
npx tsx examples/usage.ts
```

This runs through webhook parsing and validation demos immediately, with live API operations commented out (uncomment the ones you want to test).

### 5. Run unit tests after making changes

```bash
cd /path/to/payd-sdks/node
npm test             # runs all 101 tests
npm run typecheck    # checks TypeScript types
npm run build        # rebuilds dist/
```

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
