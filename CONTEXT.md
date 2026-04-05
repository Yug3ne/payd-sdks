# CONTEXT.md — Payd SDK Architecture & Contributor Guide

This document explains how the Payd SDK works, the design decisions behind it, and how to add support for new languages.

---

## Table of Contents

1. [How the Payd API Works](#how-the-payd-api-works)
2. [SDK Architecture](#sdk-architecture)
3. [Key Design Decisions](#key-design-decisions)
4. [File Map](#file-map)
5. [How to Add a New Language SDK](#how-to-add-a-new-language-sdk)
6. [Python SDK Guide](#python-sdk-guide)
7. [PHP SDK Guide](#php-sdk-guide)
8. [Testing Strategy](#testing-strategy)

---

## How the Payd API Works

### Authentication

Every request uses **HTTP Basic Auth**. Credentials are a username:password pair generated from the Payd dashboard. The SDK Base64-encodes them into an `Authorization: Basic <base64>` header that is attached to every request automatically.

There are **two different usernames** in the system:

| | API Username | Payd Account Username |
|---|---|---|
| Purpose | Authenticates the HTTP request | Identifies which account to act on |
| Set in SDK | `apiUsername` (constructor, used for auth header) | `defaultUsername` or per-method `username` param (sent in request body) |

### Base URL

All endpoints live under `https://api.payd.money` except Network Discovery which uses `https://api.payd.money/v2/networks/grouped` (no `/api` prefix).

### Endpoint Overloading

The API reuses the same routes for different operations distinguished by the request body:

- `POST /api/v2/payments` serves M-Pesa collection, card collection, AND Pan-African payouts
- The `channel` field in the body determines which operation runs

The SDK hides this by exposing each operation as a distinct method.

### Response Quirks

Different endpoints return the transaction reference under different keys:

| Endpoint | Key |
|----------|-----|
| Collections | `transaction_reference` |
| Payouts (v2/withdrawal) | `correlator_id` |
| Card payments | Sometimes `payd_transaction_ref` |

The SDK normalizes all of these into a single `transactionReference` field.

### Webhook Pattern

All async operations (collections, payouts) work like this:

1. You call the API → get an immediate response with a `transactionReference`
2. The transaction processes asynchronously
3. Payd POSTs the result to your `callback_url` (the webhook)
4. The webhook payload contains `result_code` (0 = success) and `success` (boolean)

The webhook is the **source of truth** — not the initial API response.

### Network Discovery (Pan-African 2-step flow)

Pan-African operations require calling Network Discovery first:

1. `GET /v2/networks/grouped?transaction_type=receipt&dial_code=+234` → returns available networks
2. Extract `id` → use as `network_code`, extract `selected_channel_id` → use as `channel_id`
3. Pass these into the Pan-African collection or payout call

---

## SDK Architecture

### Resource Namespacing

```
PaydClient
  ├── collections.mpesa()          # Kenya M-Pesa STK Push
  ├── collections.card()           # Card payments (hosted checkout)
  ├── collections.panAfrican()     # Pan-African mobile money + bank
  ├── payouts.mpesa()              # Kenya M-Pesa payout
  ├── payouts.panAfrican()         # Pan-African payout
  ├── payouts.merchant()           # Paybill/Till payout
  ├── transfers.send()             # Payd-to-Payd instant transfer
  ├── networks.discover()          # Network Discovery with helpers
  ├── transactions.getStatus()     # Transaction lookup
  ├── balances.getAll()            # Account balances
  └── webhooks.parseEvent()        # Webhook parsing + verification
```

Each resource is a separate class that receives the client instance (which provides the HTTP layer and defaults).

### Request Flow

Every SDK method follows this pipeline:

```
User calls method with camelCase params
  → Resolve defaults (username, callbackUrl, walletType from client config)
  → Validate params (phone format, amount range, required fields)
  → Build snake_case request body for the API
  → HTTP request (with Basic Auth, timeout, retry)
  → Check response: HTTP status AND success field (API can return 200 with success:false)
  → Normalize response (camelCase, resolve transactionReference from whichever key)
  → Return typed response object with _raw field for the original
```

### Error Hierarchy

```
PaydError (base — all SDK errors extend this)
  ├── PaydValidationError     — client-side, thrown BEFORE the HTTP call
  │     .field                — which param failed (e.g., "phoneNumber")
  ├── PaydAuthenticationError — HTTP 401
  ├── PaydAPIError            — API returned error (non-2xx or success:false)
  │     .statusCode           — HTTP status or API status
  │     .detail               — raw response body
  ├── PaydNetworkError        — connection/timeout failures
  │     .cause                — original error
  └── PaydWebhookVerificationError — HMAC signature mismatch
```

### Network Discovery Helpers

The `discover()` method returns a rich response with helper methods:

```typescript
const networks = await payd.networks.discover("receipt", "+234");

// Find by name (case-insensitive partial match)
const mtn = networks.findMobile("MTN");

// Get params ready to spread into a payment request
const params = mtn.toPaymentParams();
// → { networkCode, channelId, transactionChannel, providerName, providerCode }

await payd.collections.panAfrican({ ...params, amount: 1800, ... });
```

### Webhook Utilities

```typescript
// Parse a raw webhook payload into a typed event
const event = payd.webhooks.parseEvent(req.body);
event.isSuccess          // derived: result_code === 0 && success === true
event.transactionType    // derived from ref suffix: eR→receipt, eW→withdrawal, eS→transfer

// Verify HMAC-SHA256 signature (for Payd Connect webhooks)
payd.webhooks.verify(body, signature, secret);

// Verify + parse in one step
payd.webhooks.constructEvent(body, signature, secret);
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Hand-crafted, not generated** | No OpenAPI spec exists. Only 10 endpoints. Endpoint overloading would produce bad generated code. |
| **Resource namespacing** | `collections.mpesa()` is clearer than `createPayment({channel: "MPESA"})` since the same API route serves multiple operations. |
| **Eager client-side validation** | Catching a bad phone number in 0ms is better than waiting 500ms for an API round-trip. |
| **Phone normalization** | `+254700000000` auto-converts to `0700000000` for Kenya endpoints. Developers mix formats constantly. |
| **Unified transactionReference** | The API returns `transaction_reference`, `correlator_id`, or `payd_transaction_ref` depending on the endpoint. The SDK always returns `.transactionReference`. |
| **`_raw` field on every response** | Developers can always access the original API response if they need a field the SDK doesn't expose. |
| **Client-level defaults** | Setting `defaultUsername` and `defaultCallbackUrl` once eliminates repetition across every call. |
| **Dual error check (HTTP + success field)** | The Payd API can return HTTP 200 with `success: false`. The SDK checks both. |

---

## File Map

### `shared/fixtures/`

Canonical JSON examples extracted from the Payd API docs. Used by:
- Unit tests in every SDK (contract tests)
- The test-app for pre-filling forms
- This document for reference

### `node/src/`

| File | Purpose |
|------|---------|
| `index.ts` | Public API barrel — all exports |
| `client.ts` | PaydClient class, HTTP layer, Basic Auth, retry |
| `errors.ts` | 5 error classes |
| `webhooks.ts` | parseEvent(), verify(), constructEvent() |
| `resources/collections.ts` | mpesa(), card(), panAfrican() |
| `resources/payouts.ts` | mpesa(), merchant(), panAfrican() |
| `resources/transfers.ts` | send() |
| `resources/networks.ts` | discover() + findMobile/findBank/toPaymentParams |
| `resources/transactions.ts` | getStatus() |
| `resources/balances.ts` | getAll() |
| `validators/phone.ts` | Kenya + international phone validation, normalization |
| `validators/amount.ts` | M-Pesa/card/positive amount checks |
| `validators/params.ts` | Required fields, enum validation |
| `types/*.ts` | All request/response TypeScript interfaces |

### `test-app/`

| File | Purpose |
|------|---------|
| `server.js` | Express server — one route per SDK operation |
| `lib/sdk-client.js` | PaydClient factory (env or runtime config) |
| `lib/fixtures.js` | Loads shared fixtures for forms |
| `lib/test-suite.js` | "Run All" test definitions |
| `public/index.html` | Single-page dashboard |
| `public/app.js` | Client-side JS (fetch calls, UI updates) |
| `public/style.css` | Dark theme styling |

---

## How to Add a New Language SDK

Every SDK should follow the same architecture. Here's the blueprint:

### 1. Create the directory

```
payd-sdks/
  python/       # or php/, go/, ruby/, etc.
    src/         # or lib/, payd/, etc. (language convention)
    tests/
    README.md
```

### 2. Implement the same structure

Every SDK needs these pieces:

| Component | What it does |
|-----------|-------------|
| **Client class** | Constructor takes credentials, builds auth header, holds defaults |
| **HTTP layer** | Makes requests, attaches auth, handles timeout/retry |
| **Resource namespaces** | collections, payouts, transfers, networks, transactions, balances |
| **Error classes** | Same 5 error types as the Node SDK |
| **Validators** | Phone format, amount range, required fields |
| **Webhook utilities** | parseEvent, verify (HMAC-SHA256) |
| **Types/models** | Request/response shapes (language-appropriate) |

### 3. Use `shared/fixtures/` for tests

Import the JSON fixtures from `../../shared/fixtures/` in your tests. This ensures all SDKs test against the same API contract. If the API changes, updating the fixtures breaks tests in every SDK simultaneously.

### 4. Map camelCase → snake_case

The SDK exposes camelCase to developers but sends snake_case to the API:

| SDK param | API field |
|-----------|-----------|
| `phoneNumber` | `phone_number` |
| `callbackUrl` | `callback_url` |
| `networkCode` | `network_code` |
| `channelId` | `channel_id` |
| `transactionChannel` | `transaction_channel` |
| `accountName` | `account_name` |
| `accountNumber` | `account_number` |
| `accountHolderName` | `account_holder_name` |
| `businessAccount` | `business_account` |
| `businessNumber` | `business_number` |
| `providerName` | `provider_name` |
| `providerCode` | `provider_code` |
| `walletType` | `wallet_type` |
| `receiverUsername` | `receiver_username` |
| `redirectUrl` | `redirect_url` |
| `paymentMethod` | `payment_method` |

For Python and PHP, use the language's native naming convention (snake_case for Python, camelCase for PHP) — but always send snake_case to the API.

### 5. Endpoint reference

| Operation | Method | Path | Body fields |
|-----------|--------|------|-------------|
| M-Pesa Collection | POST | `/api/v2/payments` | username, channel="MPESA", amount, phone_number, narration, currency="KES", callback_url |
| Card Collection | POST | `/api/v2/payments` | username, channel="card", payment_method="card", amount, phone_number, narration, currency="KES", callback_url |
| Pan-African Collection | POST | `/api/v3/payments` | username, account_name, amount, phone_number, account_number, network_code, channel_id, narration, currency, callback_url, transaction_channel, redirect_url? |
| M-Pesa Payout | POST | `/api/v2/withdrawal` | phone_number, amount, narration, callback_url, channel="MPESA", currency="KES", wallet_type? |
| Pan-African Payout | POST | `/api/v2/payments` | username, network_code, account_name, account_holder_name, account_number, amount, phone_number, channel_id, narration, currency, callback_url, transaction_channel, channel, provider_name, provider_code, wallet_type? |
| Merchant Payout | POST | `/api/v3/withdrawal` | username, amount, currency="KES", phone_number, narration, transaction_channel="bank", channel="bank", business_account, business_number, callback_url, wallet_type? |
| P2P Transfer | POST | `/api/v2/remittance` | receiver_username, amount, narration, phone_number?, currency?, wallet_type? |
| Balances | GET | `/api/v1/accounts/{username}/all_balances` | — |
| Transaction Status | GET | `/api/v1/status/{ref}` | — |
| Network Discovery | GET | `/v2/networks/grouped` | query: transaction_type, dial_code |

---

## Python SDK Guide

### Recommended stack

| Component | Library |
|-----------|---------|
| HTTP client | `httpx` (async) + `requests` (sync) |
| Types/models | `dataclasses` or `pydantic` |
| Testing | `pytest` + `pytest-asyncio` |
| Build | `hatchling` or `setuptools` |
| Publish | PyPI as `payd` |

### Suggested structure

```
python/
  payd/
    __init__.py          # PaydClient export
    client.py            # PaydClient with sync + async
    errors.py            # PaydError, PaydValidationError, etc.
    webhooks.py          # parse_event(), verify()
    resources/
      __init__.py
      collections.py     # mpesa(), card(), pan_african()
      payouts.py         # mpesa(), merchant(), pan_african()
      transfers.py       # send()
      networks.py        # discover() with find_mobile(), to_payment_params()
      transactions.py    # get_status()
      balances.py        # get_all()
    validators/
      __init__.py
      phone.py
      amount.py
      params.py
    types/
      __init__.py        # TypedDict or dataclass definitions
  tests/
    test_collections.py
    test_payouts.py
    ...
  pyproject.toml
  README.md
```

### Python naming conventions

Use snake_case for everything (it's Pythonic). The user-facing API should look like:

```python
from payd import PaydClient

payd = PaydClient(
    api_username="your_api_username",
    api_password="your_api_password",
    default_username="your_payd_username",
)

# Sync
result = payd.collections.mpesa(
    amount=500,
    phone_number="0700000000",
    narration="Order #1234",
    callback_url="https://example.com/webhook",
)

# Async
result = await payd.collections.mpesa(...)
```

### Dual sync/async pattern

Offer both. The simplest approach:

```python
class PaydClient:
    """Sync client using requests."""
    ...

class AsyncPaydClient:
    """Async client using httpx."""
    ...
```

Or use a single class with `httpx` that supports both modes.

### Reference implementation

There's an existing async Python client at `../payd-connect/app/clients/payd.py` (outside this repo, in the payd-connect project). It covers all 10 endpoints with httpx. Use it as a starting point but add:
- Typed request/response dataclasses
- Client-side validation
- Webhook utilities
- Sync support

---

## PHP SDK Guide

### Recommended stack

| Component | Library |
|-----------|---------|
| HTTP client | Guzzle 7 |
| Testing | PHPUnit |
| Build | Composer |
| Publish | Packagist as `payd/payd-php` |
| Min version | PHP 8.1+ |

### Suggested structure

```
php/
  src/
    PaydClient.php           # Main client class
    Errors/
      PaydError.php
      PaydValidationError.php
      PaydAPIError.php
      PaydAuthenticationError.php
      PaydNetworkError.php
    Resources/
      Collections.php        # mpesa(), card(), panAfrican()
      Payouts.php            # mpesa(), merchant(), panAfrican()
      Transfers.php          # send()
      Networks.php           # discover()
      Transactions.php       # getStatus()
      Balances.php           # getAll()
    Validators/
      PhoneValidator.php
      AmountValidator.php
    Webhooks.php             # parseEvent(), verify()
    Types/                   # DTOs or typed arrays
  tests/
  composer.json
  README.md
```

### PHP naming conventions

Use camelCase for methods and properties (PHP convention):

```php
use Payd\PaydClient;

$payd = new PaydClient([
    'apiUsername' => $_ENV['PAYD_API_USERNAME'],
    'apiPassword' => $_ENV['PAYD_API_PASSWORD'],
    'defaultUsername' => 'your_payd_username',
]);

$result = $payd->collections->mpesa([
    'amount' => 500,
    'phoneNumber' => '0700000000',
    'narration' => 'Order #1234',
    'callbackUrl' => 'https://example.com/webhook',
]);

echo $result->transactionReference;
```

### PHP-specific considerations

- Use `GuzzleHttp\Client` with `['auth' => [$username, $password]]` for Basic Auth
- Return typed DTO objects, not raw arrays
- Throw custom exception classes that extend `\Exception`
- Use `hash_hmac('sha256', ...)` for webhook verification
- Support Laravel via an optional `PaydServiceProvider` that reads config from `config/payd.php`

---

## Testing Strategy

### Unit tests (every SDK)

1. **Mock the HTTP client** — don't hit the real API in unit tests
2. **Load `shared/fixtures/`** — use the canonical JSON as mock responses
3. **Test request construction** — verify the correct URL, method, headers, and body are built
4. **Test response parsing** — feed fixture JSON into the parser, assert typed fields
5. **Test validation** — bad phone numbers, out-of-range amounts, missing fields
6. **Test error mapping** — API error responses map to the correct error class
7. **Test webhook parsing** — success/failure payloads, isSuccess derivation, transaction type detection

### Integration tests (optional, gated by env vars)

```bash
PAYD_TEST_USERNAME=xxx PAYD_TEST_PASSWORD=xxx npm test -- --integration
```

Only run against the live API when credentials are set. Never commit credentials.

### Test app (manual + regression)

The `test-app/` provides:
- Interactive testing of every operation via a web UI
- "Run All Tests" button for quick regression checks
- Live webhook event viewer

Run it after any SDK change to verify end-to-end behavior.

---

## Checklist for a New SDK

- [ ] Client class with Basic Auth and configurable defaults
- [ ] All 10 operations implemented with proper param mapping
- [ ] Client-side validation (phone, amount, required fields)
- [ ] Response normalization (transactionReference)
- [ ] Error hierarchy (5 error types)
- [ ] Webhook parsing with isSuccess and transactionType derivation
- [ ] Webhook HMAC-SHA256 verification
- [ ] Network Discovery helpers (findMobile, findBank, toPaymentParams)
- [ ] Unit tests using shared/fixtures/
- [ ] README with install instructions and code examples for every operation
- [ ] Package metadata (name, description, license, repository)
- [ ] Published to the language's package registry
