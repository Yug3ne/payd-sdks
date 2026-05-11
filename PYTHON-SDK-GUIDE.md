# Payd Python SDK — Build Guide & Node SDK Deep Dive

---

# PART 1: Python SDK Build Guide (Step-by-Step Todo List)

This is your hands-on roadmap. Each phase builds on the previous one. Check off items as you go.

---

## Phase 1: Project Setup & Scaffolding

### 1.1 Create the directory structure
- [ ] Create `python/` directory inside `payd-sdks/`
- [ ] Create the package directory `python/payd/`
- [ ] Create `python/payd/__init__.py`
- [ ] Create `python/payd/client.py`
- [ ] Create `python/payd/errors.py`
- [ ] Create `python/payd/webhooks.py`
- [ ] Create `python/payd/resources/__init__.py`
- [ ] Create `python/payd/resources/collections.py`
- [ ] Create `python/payd/resources/payouts.py`
- [ ] Create `python/payd/resources/transfers.py`
- [ ] Create `python/payd/resources/networks.py`
- [ ] Create `python/payd/resources/transactions.py`
- [ ] Create `python/payd/resources/balances.py`
- [ ] Create `python/payd/validators/__init__.py`
- [ ] Create `python/payd/validators/phone.py`
- [ ] Create `python/payd/validators/amount.py`
- [ ] Create `python/payd/validators/params.py`
- [ ] Create `python/tests/` directory
- [ ] Create `python/README.md`

### 1.2 Set up `pyproject.toml`
- [ ] Create `python/pyproject.toml` with:
  - Package name: `payd`
  - Build system: `hatchling` (or `setuptools`)
  - Python requirement: `>=3.9`
  - Dependencies: `httpx>=0.25.0` (for async+sync HTTP)
  - Dev dependencies: `pytest`, `pytest-asyncio`, `pytest-httpx` (or `respx` for mocking)
  - Version: `0.1.0`
  - Author, license (MIT), description, keywords, repository URL

### 1.3 Set up development environment
- [ ] Create a virtual environment: `python -m venv .venv`
- [ ] Activate it: `source .venv/bin/activate`
- [ ] Install in editable mode: `pip install -e ".[dev]"`
- [ ] Verify imports work: `python -c "import payd"`

---

## Phase 2: Error Classes (Start Simple)

### 2.1 Implement `python/payd/errors.py`
- [ ] `PaydError(Exception)` — base class, stores `message`
- [ ] `PaydValidationError(PaydError)` — stores `message` + `field: str | None`
- [ ] `PaydAuthenticationError(PaydError)` — default message about invalid credentials
- [ ] `PaydAPIError(PaydError)` — stores `status_code: int` + `detail: Any`
- [ ] `PaydNetworkError(PaydError)` — stores `cause: Exception | None`
- [ ] `PaydWebhookVerificationError(PaydError)` — default message about signature failure

### 2.2 Write tests for errors
- [ ] Create `python/tests/test_errors.py`
- [ ] Test that each error class inherits from `PaydError`
- [ ] Test that each error stores its specific fields
- [ ] Test default messages

---

## Phase 3: Validators

### 3.1 Implement `python/payd/validators/phone.py`
- [ ] `validate_kenya_phone(phone, field="phone_number")` — regex: `^0\d{9}$`
- [ ] `validate_international_phone(phone, field="phone_number")` — regex: `^\+\d{7,15}$`
- [ ] `normalize_kenya_phone(phone)` — convert `+254XXXXXXXXX` to `0XXXXXXXXX`
- [ ] All validators raise `PaydValidationError` on failure

### 3.2 Implement `python/payd/validators/amount.py`
- [ ] `validate_amount(amount, min_val, max_val, context)` — range check
- [ ] `validate_mpesa_amount(amount)` — 10 to 250,000 KES
- [ ] `validate_card_amount(amount)` — minimum 100 KES
- [ ] `validate_positive_amount(amount)` — must be > 0

### 3.3 Implement `python/payd/validators/params.py`
- [ ] `validate_required(params: dict, required_fields: list[str])` — checks not None/empty
- [ ] `validate_enum(value, allowed: list[str], field)` — checks value in list

### 3.4 Write tests for validators
- [ ] Create `python/tests/test_validators.py`
- [ ] Test valid Kenya phone numbers (0700000000)
- [ ] Test invalid Kenya phones (wrong length, missing 0 prefix, letters)
- [ ] Test phone normalization (+254 → 0 prefix)
- [ ] Test valid international phones (+2340000000000)
- [ ] Test M-Pesa amount boundaries (9 fails, 10 passes, 250000 passes, 250001 fails)
- [ ] Test card amount minimum (99 fails, 100 passes)
- [ ] Test positive amount (0 fails, -1 fails, 1 passes)
- [ ] Test required fields (missing, None, empty string all fail)
- [ ] Test enum validation

---

## Phase 4: HTTP Client (The Core)

### 4.1 Implement `python/payd/client.py`
- [ ] Define `PaydClient` class
- [ ] Constructor takes: `api_username`, `api_password`, `base_url`, `timeout`, `wallet_type`, `default_callback_url`, `default_username`, `debug`, `max_retries`
- [ ] Validate credentials in constructor (raise `PaydAuthenticationError` if empty)
- [ ] Build Basic Auth header: `base64.b64encode(f"{user}:{pass}".encode()).decode()`
- [ ] Store defaults dict: `wallet_type`, `callback_url`, `username`
- [ ] Implement `_request(method, path, body=None, query=None)`:
  - Build full URL from base_url + path + query params
  - Set headers: Authorization, Content-Type, Accept
  - Make request with `httpx` (sync: `httpx.Client`, async: `httpx.AsyncClient`)
  - Handle timeout via httpx timeout parameter
  - If debug, print request/response details
  - Check for 401 → raise `PaydAuthenticationError`
  - Parse JSON response
  - Check HTTP status AND `success` field (dual check!)
  - On error: raise `PaydAPIError`
  - Retry logic: exponential backoff (200ms, 400ms, 800ms) for 5xx/network errors
  - On all retries exhausted: raise `PaydNetworkError`
- [ ] Initialize all resource namespaces (collections, payouts, etc.)

### 4.2 Decide on sync vs async approach
- [ ] **Option A** (recommended): Single class using `httpx.Client` for sync
- [ ] **Option B**: Also create `AsyncPaydClient` using `httpx.AsyncClient`
- [ ] Either way, start with sync — add async later

### 4.3 Write tests for client
- [ ] Create `python/tests/test_client.py`
- [ ] Test constructor validates credentials
- [ ] Test Basic Auth header is built correctly
- [ ] Test defaults are stored
- [ ] Test successful request/response cycle (mock httpx)
- [ ] Test 401 raises `PaydAuthenticationError`
- [ ] Test non-2xx raises `PaydAPIError`
- [ ] Test success:false with HTTP 200 raises `PaydAPIError`
- [ ] Test retry logic (mock failures then success)
- [ ] Test timeout handling

---

## Phase 5: Resource Classes (The Meat)

### 5.1 Implement Collections (`python/payd/resources/collections.py`)
- [ ] Class `Collections` — constructor takes `client` reference
- [ ] `mpesa(username, amount, phone_number, narration, callback_url)`:
  - Resolve defaults (username, callback_url from client)
  - Validate required fields
  - Normalize + validate Kenya phone
  - Validate M-Pesa amount (10-250,000)
  - POST to `/api/v2/payments` with `channel="MPESA"`, `currency="KES"`
  - Return dict/dataclass with `transaction_reference`, `success`, `message`, etc.
- [ ] `card(username, amount, phone_number, narration, callback_url)`:
  - Same validation pattern
  - Validate card amount (min 100)
  - POST to `/api/v2/payments` with `channel="card"`, `payment_method="card"`
  - Extract `checkout_url` — raise error if missing
  - Return with `checkout_url` field
- [ ] `pan_african(username, account_name, amount, phone_number, ...)`:
  - Validate all required fields (network_code, channel_id, currency, etc.)
  - Validate international phone
  - Validate positive amount
  - Validate enums (account_name, transaction_channel)
  - POST to `/api/v3/payments`
  - Parse optional `bank_account` from response
  - Return with optional `bank_account` and `checkout_url`

### 5.2 Implement Payouts (`python/payd/resources/payouts.py`)
- [ ] Class `Payouts` — constructor takes `client`
- [ ] `mpesa(phone_number, amount, narration, callback_url, wallet_type=None)`:
  - Normalize/validate Kenya phone, M-Pesa amount
  - POST to `/api/v2/withdrawal` with `channel="MPESA"`, `currency="KES"`
  - Only include `wallet_type` if not "local"
- [ ] `pan_african(username, network_code, account_name, ...)`:
  - All the pan-African fields from network discovery
  - Includes `account_holder_name`, `provider_name`, `provider_code`
  - POST to `/api/v2/payments`
- [ ] `merchant(username, amount, phone_number, narration, business_account, business_number, ...)`:
  - Validate international phone, positive amount
  - POST to `/api/v3/withdrawal` with `currency="KES"`, `channel="bank"`, `transaction_channel="bank"`

### 5.3 Implement Transfers (`python/payd/resources/transfers.py`)
- [ ] Class `Transfers` — constructor takes `client`
- [ ] `send(receiver_username, amount, narration, phone_number=None, currency=None, wallet_type=None)`:
  - Validate required: receiver_username, narration
  - Validate positive amount
  - Optional: validate international phone if provided
  - POST to `/api/v2/p2p`
  - Only include optional fields if provided

### 5.4 Implement Networks (`python/payd/resources/networks.py`)
- [ ] Class `Networks` — constructor takes `client`
- [ ] `discover(transaction_type, dial_code)`:
  - Validate required, validate enum ("receipt"/"withdrawal")
  - Validate dial_code starts with "+"
  - GET `/v2/networks/grouped` with query params
  - Transform response: snake_case raw → Python objects
  - Return object with `defaults`, `mobile`, `banks` lists
  - Add `find_mobile(name)` method — case-insensitive partial match
  - Add `find_bank(name)` method — same
  - Each network has `to_payment_params()` → returns dict with `network_code`, `channel_id`, `transaction_channel`, `provider_name`, `provider_code`

### 5.5 Implement Transactions (`python/payd/resources/transactions.py`)
- [ ] Class `Transactions` — constructor takes `client`
- [ ] `get_status(transaction_reference)`:
  - Validate required
  - GET `/api/v1/status/{ref}` (URL-encode the ref)
  - Parse nested `transaction_details` object
  - Return typed response

### 5.6 Implement Balances (`python/payd/resources/balances.py`)
- [ ] Class `Balances` — constructor takes `client`
- [ ] `get_all(username=None)`:
  - Resolve username from defaults
  - GET `/api/v1/accounts/{username}/all_balances`
  - Parse `fiat_balance` and `onchain_balance`
  - Return typed response

### 5.7 Write tests for all resources
- [ ] Create `python/tests/test_collections.py` — mock HTTP, use `shared/fixtures/collections/`
- [ ] Create `python/tests/test_payouts.py` — use `shared/fixtures/payouts/`
- [ ] Create `python/tests/test_transfers.py` — use `shared/fixtures/transfers/`
- [ ] Create `python/tests/test_networks.py` — use `shared/fixtures/networks/`
- [ ] Create `python/tests/test_transactions.py` — use `shared/fixtures/transactions/`
- [ ] Create `python/tests/test_balances.py` — use `shared/fixtures/balances/`

---

## Phase 6: Webhooks

### 6.1 Implement `python/payd/webhooks.py`
- [ ] Class `Webhooks`
- [ ] `parse_event(body)`:
  - Accept JSON string or dict
  - Parse if string, validate if dict
  - Extract all fields from payload
  - Derive `is_success`: `result_code == 0 and success == True`
  - Derive `transaction_type` from reference suffix: `eR`→receipt, `eW`→withdrawal, `eS`→transfer, `eT`→topup
  - Include `_raw` field
- [ ] `verify(body, signature, secret)`:
  - Normalize body (parse JSON, re-serialize with sorted keys)
  - Compute HMAC-SHA256: `hmac.new(secret.encode(), normalized.encode(), hashlib.sha256).hexdigest()`
  - Use `hmac.compare_digest()` for timing-safe comparison
  - Raise `PaydWebhookVerificationError` on mismatch
- [ ] `construct_event(body, signature, secret)`:
  - Verify then parse in one call

### 6.2 Write tests for webhooks
- [ ] Create `python/tests/test_webhooks.py`
- [ ] Test parsing Kenya success webhook (from `shared/fixtures/webhooks/kenya-success.json`)
- [ ] Test parsing Kenya failure webhook
- [ ] Test parsing Pan-African success webhook
- [ ] Test parsing Pan-African failure webhook
- [ ] Test `is_success` derivation
- [ ] Test `transaction_type` derivation from reference suffixes
- [ ] Test HMAC verification with known signature
- [ ] Test verification failure raises error
- [ ] Test `construct_event` does both

---

## Phase 7: Package Entry Point & Exports

### 7.1 Wire up `python/payd/__init__.py`
- [ ] Export `PaydClient` (and `AsyncPaydClient` if implemented)
- [ ] Export all error classes
- [ ] Export resource classes (for type hinting)
- [ ] Export `Webhooks` class
- [ ] Export validator functions (for advanced use)
- [ ] Add module docstring with usage example

### 7.2 Wire up `python/payd/resources/__init__.py`
- [ ] Export all resource classes

### 7.3 Wire up `python/payd/validators/__init__.py`
- [ ] Export all validator functions

---

## Phase 8: Documentation & Examples

### 8.1 Write README.md
- [ ] Installation instructions (`pip install payd`)
- [ ] Quick start example (initialize + collect via M-Pesa)
- [ ] Examples for every operation:
  - M-Pesa collection
  - Card collection
  - Pan-African collection (with network discovery)
  - M-Pesa payout
  - Pan-African payout
  - Merchant payout
  - Payd-to-Payd transfer
  - Balance check
  - Transaction status lookup
  - Webhook handling
- [ ] Error handling section
- [ ] Client options reference
- [ ] Async usage example (if applicable)

### 8.2 Create examples file
- [ ] Create `python/examples/usage.py` with runnable examples

---

## Phase 9: Build, Test, Publish

### 9.1 Run all tests
- [ ] `cd python && pytest -v`
- [ ] Ensure all tests pass
- [ ] Check coverage: `pytest --cov=payd`

### 9.2 Build the package
- [ ] `python -m build`
- [ ] Verify the wheel and sdist are created

### 9.3 Publish to PyPI
- [ ] Create PyPI account if needed
- [ ] `twine upload dist/*`
- [ ] Verify installation: `pip install payd`

---

## Phase 10: Async Support (Optional Enhancement)

- [ ] Create `AsyncPaydClient` using `httpx.AsyncClient`
- [ ] All resource methods become `async def`
- [ ] Add `async with` context manager support
- [ ] Write async-specific tests with `pytest-asyncio`

---

## Key Files to Reference While Building

| What you need | Where to find it |
|---|---|
| API endpoints, body fields, quirks | `payd-sdks/CONTEXT.md` (Section: Endpoint reference) |
| camelCase → snake_case mapping | `payd-sdks/CONTEXT.md` (Section: Map camelCase → snake_case) |
| Example request/response JSON | `payd-sdks/shared/fixtures/` |
| Node SDK as reference implementation | `payd-sdks/node/src/` |
| Python-specific recommendations | `payd-sdks/CONTEXT.md` (Section: Python SDK Guide) |

---
---

# PART 2: Node SDK — Complete Line-by-Line Code Walkthrough

This section explains **every single line** of the Node SDK so you can fully understand the patterns before rewriting them in Python.

---

## File 1: `src/errors.ts` — Error Class Hierarchy

This file defines the 6 error types the SDK can throw. Every error extends a base `PaydError` class.

```typescript
/**
 * Base error class for all Payd SDK errors.
 */
export class PaydError extends Error {
  constructor(message: string) {
    super(message);                                    // Call the parent Error constructor with the message
    this.name = "PaydError";                           // Override the error name (shows in stack traces)
    Object.setPrototypeOf(this, new.target.prototype); // Fix prototype chain — required for extending built-in Error in TypeScript
  }
}
```

**Why `Object.setPrototypeOf`?** In TypeScript/JavaScript, when you extend built-in classes like `Error`, the prototype chain breaks. Without this line, `instanceof PaydError` would return `false`. This is a well-known TypeScript workaround.

**Python equivalent:** Python doesn't have this issue. Just use `class PaydError(Exception): pass`.

```typescript
/**
 * Thrown when API authentication fails (HTTP 401).
 */
export class PaydAuthenticationError extends PaydError {
  constructor(message = "Invalid API credentials. Check your apiUsername and apiPassword.") {
    super(message);                        // Pass message to PaydError → Error
    this.name = "PaydAuthenticationError"; // Override name for stack traces
  }
}
```

**What this does:** If the Payd API returns HTTP 401, the SDK throws this instead of a generic error. The default message tells the developer exactly what went wrong. The `message = "..."` is a default parameter — if no message is passed, it uses the default.

```typescript
/**
 * Thrown for client-side validation failures before the HTTP request is made.
 */
export class PaydValidationError extends PaydError {
  public readonly field?: string;  // Optional: which specific field failed validation

  constructor(message: string, field?: string) {
    super(message);
    this.name = "PaydValidationError";
    this.field = field;            // e.g., "phoneNumber" or "amount"
  }
}
```

**What this does:** When you pass a bad phone number or amount, the SDK throws this BEFORE making any HTTP request. The `field` property tells you exactly which parameter was wrong. For example: `new PaydValidationError("phoneNumber must be 10 digits", "phoneNumber")`.

**Why `public readonly`?** `public` means it's accessible from outside the class. `readonly` means it can only be set in the constructor — it can never be changed after creation. This is immutability — errors should be read-only.

```typescript
export class PaydAPIError extends PaydError {
  public readonly statusCode: number;  // The HTTP status code (e.g., 400, 500)
  public readonly detail: unknown;     // The raw response body from the API

  constructor(statusCode: number, message: string, detail?: unknown) {
    super(message);
    this.name = "PaydAPIError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}
```

**What this does:** When the API returns an error (non-2xx HTTP status, OR HTTP 200 with `success: false`), this error is thrown. It carries both the status code and the full raw response body so the developer can inspect what went wrong.

**Why `unknown` type?** `unknown` is TypeScript's type-safe alternative to `any`. It means "this could be anything — you must check its type before using it." The API response body could be any shape.

```typescript
export class PaydNetworkError extends PaydError {
  public readonly cause?: Error;  // The original error (e.g., DNS failure, connection refused)

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "PaydNetworkError";
    this.cause = cause;
  }
}
```

**What this does:** Thrown when the SDK can't reach the API at all — DNS errors, connection refused, timeouts, or all retries exhausted. The `cause` wraps the original low-level error.

```typescript
export class PaydWebhookVerificationError extends PaydError {
  constructor(message = "Webhook signature verification failed.") {
    super(message);
    this.name = "PaydWebhookVerificationError";
  }
}
```

**What this does:** Thrown when HMAC-SHA256 webhook signature verification fails. This means the webhook payload was tampered with or the secret is wrong.

---

## File 2: `src/validators/phone.ts` — Phone Number Validation

```typescript
import { PaydValidationError } from "../errors";
```
Imports the error class so validators can throw it.

```typescript
/** Validates a Kenyan phone number (10 digits, starting with 0) */
const KENYA_PHONE_REGEX = /^0\d{9}$/;
```
**Regex breakdown:** `^` = start of string, `0` = literal zero, `\d{9}` = exactly 9 more digits, `$` = end of string. Total: exactly 10 digits starting with 0. Examples that pass: `0700000000`, `0112345678`. Examples that fail: `+254700000000`, `070000000` (9 digits), `1700000000`.

```typescript
/** Validates an international phone number (starts with +, 7-15 digits) */
const INTERNATIONAL_PHONE_REGEX = /^\+\d{7,15}$/;
```
**Regex breakdown:** `^` start, `\+` literal plus sign (backslash escapes it since `+` is special in regex), `\d{7,15}` = between 7 and 15 digits, `$` end. Covers all international formats from short (e.g., `+2341234567`) to long (e.g., `+234000000000000`).

```typescript
export function validateKenyaPhone(phone: string, field = "phoneNumber"): void {
  if (!phone) {                                      // Falsy check: catches null, undefined, empty string
    throw new PaydValidationError(`${field} is required`, field);
  }
  if (!KENYA_PHONE_REGEX.test(phone)) {              // .test() returns true/false for regex match
    throw new PaydValidationError(
      `${field} must be exactly 10 digits starting with 0 (e.g., 0700000000). Got: "${phone}"`,
      field,
    );
  }
}
```
**What this does:** Two checks — first that the phone isn't empty, then that it matches the regex. The error messages include the actual value the developer passed (`Got: "${phone}"`) which is incredibly helpful for debugging.

**Why `field = "phoneNumber"`?** Default parameter. Usually the field is called "phoneNumber" but some methods might call it something else, so it's configurable.

**Why `: void`?** The function returns nothing. It either succeeds silently or throws an error. This is the "validate or throw" pattern.

```typescript
export function validateInternationalPhone(phone: string, field = "phoneNumber"): void {
  if (!phone) {
    throw new PaydValidationError(`${field} is required`, field);
  }
  if (!INTERNATIONAL_PHONE_REGEX.test(phone)) {
    throw new PaydValidationError(
      `${field} must start with + followed by 7-15 digits (e.g., +2340000000000). Got: "${phone}"`,
      field,
    );
  }
}
```
Same pattern as above, but for international format with `+` prefix. Used for Pan-African operations and merchant payouts.

```typescript
export function normalizeKenyaPhone(phone: string): string {
  if (phone.startsWith("+254") && phone.length === 13) {  // +254 (4 chars) + 9 digits = 13 chars
    return "0" + phone.slice(4);                           // Replace "+254" with "0"
  }
  return phone;                                            // Return unchanged if not +254 format
}
```
**What this does:** Developers often pass `+254700000000` instead of `0700000000`. This function auto-converts. `phone.slice(4)` removes the first 4 characters (`+254`), then prepends `0`. So `+254700000000` → `0700000000`.

**Why not just always convert?** It only converts if the phone starts with `+254` AND is exactly 13 characters. If someone passes `0700000000` (already correct) or some other format, it returns unchanged.

---

## File 3: `src/validators/amount.ts` — Amount Validation

```typescript
import { PaydValidationError } from "../errors";

export function validateAmount(
  amount: number,
  min: number,
  max: number,
  context: string,
): void {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new PaydValidationError("amount is required and must be a number", "amount");
  }
  if (amount < min) {
    throw new PaydValidationError(
      `amount must be at least ${min} for ${context}. Got: ${amount}`,
      "amount",
    );
  }
  if (amount > max) {
    throw new PaydValidationError(
      `amount must be at most ${max} for ${context}. Got: ${amount}`,
      "amount",
    );
  }
}
```
**Three-layer check:** First checks the value exists and is actually a number (not null, not a string, not NaN). Then checks minimum. Then checks maximum. The `context` parameter makes error messages specific: "amount must be at least 10 for M-Pesa transactions".

**Why `amount == null`?** Double equals (`==`) checks both `null` and `undefined` in JavaScript. This is one of the few cases where `==` is preferred over `===`.

```typescript
export function validateMpesaAmount(amount: number): void {
  validateAmount(amount, 10, 250_000, "M-Pesa transactions");
}
```
Convenience wrapper. M-Pesa transactions in Kenya must be between KES 10 and KES 250,000. The `250_000` uses numeric separators for readability (same as `250000`).

```typescript
export function validateCardAmount(amount: number): void {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new PaydValidationError("amount is required and must be a number", "amount");
  }
  if (amount < 100) {
    throw new PaydValidationError(
      `amount must be at least 100 KES for card payments. Got: ${amount}`,
      "amount",
    );
  }
}
```
Card payments have a minimum of 100 KES but no maximum. So it doesn't use the generic `validateAmount` — only checks minimum.

```typescript
export function validatePositiveAmount(amount: number): void {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new PaydValidationError("amount is required and must be a number", "amount");
  }
  if (amount <= 0) {
    throw new PaydValidationError(
      `amount must be greater than 0. Got: ${amount}`,
      "amount",
    );
  }
}
```
Used for Pan-African and transfers where the only rule is "must be positive." No upper limit since different countries have different limits (the API enforces those).

---

## File 4: `src/validators/params.ts` — General Parameter Validation

```typescript
import { PaydValidationError } from "../errors";

export function validateRequired(
  params: Record<string, unknown>,    // Object with string keys, any values
  requiredFields: string[],            // List of keys that must exist and be non-empty
): void {
  for (const field of requiredFields) {
    const value = params[field];
    if (value === undefined || value === null || value === "") {
      throw new PaydValidationError(
        `${field} is required and cannot be empty`,
        field,
      );
    }
  }
}
```
**What this does:** Takes an object and a list of field names. Checks that each named field exists and isn't empty. This is called at the start of every SDK method to catch missing required parameters.

**Why check three conditions?** `undefined` = field not present at all. `null` = explicitly set to null. `""` = empty string. All three are considered "missing."

**Why `Record<string, unknown>`?** TypeScript type meaning "an object with string keys and values of any type." This is the generic way to accept any object shape.

```typescript
export function validateEnum(
  value: string,
  allowed: string[],
  field: string,
): void {
  if (!allowed.includes(value)) {
    throw new PaydValidationError(
      `${field} must be one of: ${allowed.join(", ")}. Got: "${value}"`,
      field,
    );
  }
}
```
**What this does:** Checks that a value is one of the allowed options. Used for fields like `accountName` (must be "bank" or "phone") and `transactionType` (must be "receipt" or "withdrawal"). The error message lists all valid options.

---

## File 5: `src/types/common.ts` — Shared Type Definitions

```typescript
export type WalletType = "local" | "USD";
```
**Union type:** A variable of type `WalletType` can ONLY be the string `"local"` or the string `"USD"`. Any other value is a compile-time error. `"local"` = KES wallet, `"USD"` = USD wallet for cross-border payments.

```typescript
export type AccountType = "bank" | "phone";
```
For Pan-African operations: `"bank"` means bank transfer, `"phone"` means mobile money.

```typescript
export type TransactionType = "receipt" | "withdrawal";
```
Used exclusively for Network Discovery: `"receipt"` = you want to collect money (find collection networks), `"withdrawal"` = you want to send money (find payout networks).

```typescript
export type TransactionKind = "receipt" | "withdrawal" | "transfer" | "topup" | "unknown";
```
Derived from transaction reference suffixes in webhooks. More values than `TransactionType` because webhooks can represent any operation.

```typescript
export interface BaseResponse {
  success: boolean;
  message?: string;        // The `?` means this field is optional — may or may not exist
  status?: string | number; // Can be either a string or number (API is inconsistent)
}
```
**What this does:** Every API response includes at least a `success` boolean. Most also include `message` and `status`. All response interfaces extend this base.

```typescript
export interface ErrorResponse {
  status: number;
  success: false;          // Literal type: success is always exactly `false`
  message: string;
}
```
Shape of an error response from the API. `success: false` is a **literal type** — not just any boolean, but specifically the value `false`.

```typescript
export interface PaydClientOptions {
  apiUsername: string;
  apiPassword: string;
  baseUrl?: string;
  timeout?: number;
  walletType?: WalletType;
  defaultCallbackUrl?: string;
  defaultUsername?: string;
  debug?: boolean;
  maxRetries?: number;
}
```
**What this does:** Defines the shape of the configuration object you pass to `new PaydClient(...)`. Required fields (`apiUsername`, `apiPassword`) have no `?`. Optional fields have `?` and will be `undefined` if not provided.

---

## File 6: `src/types/collections.ts` — Collection Type Definitions

```typescript
import type { AccountType, BaseResponse } from "./common";
```
`import type` — TypeScript-only import that is erased at compile time. It imports only the type definitions, not runtime code. This is a best practice for type-only imports.

```typescript
export interface MpesaCollectionParams {
  username: string;
  amount: number;
  phoneNumber: string;
  narration: string;
  callbackUrl: string;
}
```
**What this does:** Defines the shape of parameters for M-Pesa collection. All fields are required (no `?`). TypeScript will show compile-time errors if you forget a field.

```typescript
export interface MpesaCollectionResponse extends BaseResponse {
  paymentMethod: string;
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```
**`extends BaseResponse`** — inherits `success`, `message`, `status` from BaseResponse, then adds its own fields. `_raw` holds the original API response for developers who need fields the SDK doesn't expose.

```typescript
export interface PanAfricanCollectionParams {
  username: string;
  accountName: AccountType;  // Must be "bank" or "phone"
  amount: number;
  phoneNumber: string;
  accountNumber: string;
  networkCode: string;       // From Network Discovery (network.id)
  channelId: string;         // From Network Discovery (network.selected_channel_id)
  narration: string;
  currency: string;          // e.g., "NGN", "GHS", "ZAR"
  callbackUrl: string;
  transactionChannel: AccountType;  // Must be "bank" or "phone"
  redirectUrl?: string;      // Optional: for hosted checkout flows
}
```
Pan-African has many more fields because it covers multiple countries and payment methods. The `networkCode` and `channelId` come from the Network Discovery API.

```typescript
export interface BankAccount {
  name: string;
  branchCode: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
}
```
Some Pan-African responses include bank account details for manual bank transfer. This interface describes that nested object.

---

## File 7: `src/client.ts` — The Main Client (HTTP Layer)

This is the heart of the SDK. Let's go line by line.

```typescript
import type { PaydClientOptions } from "./types/common";
import { PaydAuthenticationError, PaydAPIError, PaydNetworkError } from "./errors";
import { Collections } from "./resources/collections";
import { Payouts } from "./resources/payouts";
import { Transfers } from "./resources/transfers";
import { Networks } from "./resources/networks";
import { Transactions } from "./resources/transactions";
import { Balances } from "./resources/balances";
import { Webhooks } from "./webhooks";
```
Imports everything the client needs. `type` import for `PaydClientOptions` (only used for types). Regular imports for errors and resource classes.

```typescript
const DEFAULT_BASE_URL = "https://api.payd.money";
const DEFAULT_TIMEOUT = 30_000;      // 30 seconds in milliseconds
const DEFAULT_MAX_RETRIES = 2;       // 2 retries = 3 total attempts
```
Constants at module level. `30_000` uses numeric separators for readability.

```typescript
type HttpMethod = "GET" | "POST";
```
The SDK only uses GET and POST. This constrains the `method` field in request options.

```typescript
export interface RequestOptions {
  method: HttpMethod;
  path: string;                        // e.g., "/api/v2/payments"
  body?: Record<string, unknown>;      // POST request body (optional)
  query?: Record<string, string>;      // URL query parameters (optional)
}
```
Internal type for how resource methods describe their HTTP requests to the client.

```typescript
export class PaydClient {
  private readonly baseUrl: string;        // "https://api.payd.money"
  private readonly authHeader: string;     // "Basic dXNlcjpwYXNz"
  private readonly timeout: number;        // 30000
  private readonly debug: boolean;         // false
  private readonly maxRetries: number;     // 2
```
**`private readonly`** — these fields can only be accessed inside the class, and can never be changed after construction. The SDK's configuration is immutable.

```typescript
  public readonly defaults: {
    walletType?: string;
    callbackUrl?: string;
    username?: string;
  };
```
**`public readonly`** — accessible from outside (resource classes need it), but can't be reassigned. These are the defaults that resource methods fall back to when the developer doesn't pass a specific value.

```typescript
  public readonly collections: Collections;
  public readonly payouts: Payouts;
  public readonly transfers: Transfers;
  public readonly networks: Networks;
  public readonly transactions: Transactions;
  public readonly balances: Balances;
  public readonly webhooks: Webhooks;
```
The seven resource namespaces. Each is a class instance. Developers use them as `payd.collections.mpesa(...)`.

```typescript
  constructor(options: PaydClientOptions) {
    if (!options.apiUsername || !options.apiPassword) {
      throw new PaydAuthenticationError(
        "apiUsername and apiPassword are required to create a PaydClient.",
      );
    }
```
**First thing:** validate that credentials exist. Fail fast — don't wait until the first API call to discover credentials are missing.

```typescript
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
```
Uses the provided base URL or falls back to the default. `.replace(/\/+$/, "")` strips trailing slashes — this prevents double slashes when building URLs like `baseUrl + "/api/v2/payments"`.

**Regex:** `/\/+$/` = one or more `/` at the end (`$`).

```typescript
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.debug = options.debug ?? false;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
```
**`??` (nullish coalescing):** Returns the right side ONLY if the left side is `null` or `undefined`. This is different from `||` which also treats `0`, `""`, and `false` as falsy. Using `??` means `timeout: 0` would actually set timeout to 0, whereas `||` would override it with the default.

```typescript
    // Build Basic Auth header
    const credentials = `${options.apiUsername}:${options.apiPassword}`;
    const encoded = typeof btoa === "function"
      ? btoa(credentials)
      : Buffer.from(credentials).toString("base64");
    this.authHeader = `Basic ${encoded}`;
```
**HTTP Basic Auth:** The standard is to send `Authorization: Basic <base64(username:password)>`.

Step 1: Concatenate username and password with `:` separator.
Step 2: Base64 encode. The ternary check handles both browser (`btoa`) and Node.js (`Buffer.from`) environments.
Step 3: Prepend `"Basic "` to create the full header value.

```typescript
    this.defaults = {
      walletType: options.walletType,
      callbackUrl: options.defaultCallbackUrl,
      username: options.defaultUsername,
    };
```
Store defaults. If the developer sets `defaultUsername: "my_user"`, then every method that needs a username will use `"my_user"` unless the developer overrides it per-call.

```typescript
    // Initialize resource namespaces
    this.collections = new Collections(this);
    this.payouts = new Payouts(this);
    this.transfers = new Transfers(this);
    this.networks = new Networks(this);
    this.transactions = new Transactions(this);
    this.balances = new Balances(this);
    this.webhooks = new Webhooks();
```
Creates instances of each resource class, passing `this` (the client) so they can access `client.request()` and `client.defaults`. Webhooks doesn't need the client — it works independently.

```typescript
  async request<T = Record<string, unknown>>(options: RequestOptions): Promise<T> {
```
**This is the core HTTP method.** `async` because it makes network calls. `<T>` is a generic type parameter — callers can specify what type the response should be. Default is `Record<string, unknown>` (any object). Returns `Promise<T>` because it's async.

```typescript
    const url = this.buildUrl(options.path, options.query);
```
Builds the full URL: `https://api.payd.money/api/v2/payments?key=value`.

```typescript
    const headers: Record<string, string> = {
      Authorization: this.authHeader,       // "Basic dXNlcjpwYXNz"
      "Content-Type": "application/json",   // We're sending JSON
      Accept: "application/json",           // We want JSON back
    };
```
Three headers on every request. `Authorization` authenticates, `Content-Type` tells the server what format we're sending, `Accept` tells the server what format we want back.

```typescript
    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };
```
`RequestInit` is the built-in type for `fetch` options. `AbortSignal.timeout()` is a Node.js 18+ API that automatically aborts the request after the timeout. If the request takes longer than 30 seconds, it throws an error.

```typescript
    if (options.body && options.method === "POST") {
      fetchOptions.body = JSON.stringify(options.body);
    }
```
Only attach a body for POST requests. `JSON.stringify` converts the JavaScript object into a JSON string for transmission.

```typescript
    if (this.debug) {
      console.log(`[Payd SDK] ${options.method} ${url}`);
      if (options.body) {
        console.log(`[Payd SDK] Body:`, JSON.stringify(options.body, null, 2));
      }
    }
```
Debug logging. Only runs if `debug: true` was passed to the constructor. `JSON.stringify(x, null, 2)` pretty-prints with 2-space indentation.

```typescript
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
```
**Retry loop.** `attempt` goes from 0 to `maxRetries` (inclusive). With `maxRetries = 2`, this runs at most 3 times (attempt 0, 1, 2). `lastError` tracks the most recent error for the final error message.

```typescript
      try {
        const response = await fetch(url, fetchOptions);
```
The actual HTTP call using Node.js built-in `fetch` (available in Node 18+). `await` pauses execution until the response arrives.

```typescript
        if (this.debug) {
          console.log(`[Payd SDK] Response: ${response.status} ${response.statusText}`);
        }

        // Handle authentication errors
        if (response.status === 401) {
          throw new PaydAuthenticationError();
        }
```
Check for 401 first and throw a specific error. No retry for auth errors — bad credentials won't magically become correct.

```typescript
        // Parse response body
        let data: Record<string, unknown>;
        try {
          data = (await response.json()) as Record<string, unknown>;
        } catch {
          throw new PaydAPIError(
            response.status,
            `Failed to parse API response (HTTP ${response.status})`,
          );
        }
```
Parse the JSON response. Wrapped in try/catch because `response.json()` can fail if the body isn't valid JSON (rare but possible). `as Record<string, unknown>` tells TypeScript to treat the parsed result as an object.

```typescript
        // Check for API errors: non-2xx OR success: false
        const isHttpOk = response.status >= 200 && response.status < 300;
        const successField = data.success;

        if (!isHttpOk || successField === false) {
          const message = (data.message as string) || `API request failed (HTTP ${response.status})`;
          const statusCode = typeof data.status === "number" ? data.status : response.status;
          throw new PaydAPIError(statusCode, message, data);
        }
```
**The dual error check.** This is critical because the Payd API can return HTTP 200 (which looks successful) but with `success: false` in the body. The SDK checks BOTH the HTTP status code AND the `success` field. If either indicates failure, it throws `PaydAPIError`.

The error message comes from `data.message` (what the API said), falling back to a generic message. Status code prefers the API's status field (if it's a number) over the HTTP status.

```typescript
        return data as T;
```
If we get here, the request succeeded. Cast the data to the expected type `T` and return it.

```typescript
      } catch (error) {
        // Don't retry client errors (4xx) or known SDK errors
        if (
          error instanceof PaydAuthenticationError ||
          error instanceof PaydAPIError ||
          (error instanceof PaydAPIError && error.statusCode < 500)
        ) {
          throw error;
        }
```
**Retry logic — what NOT to retry.** If the error is an auth error or API error (4xx), retrying won't help. These are deterministic failures. Only retry transient errors (network failures, 5xx server errors).

```typescript
        // Retry on network/5xx errors
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          // Exponential backoff: 200ms, 400ms, 800ms...
          const delay = 200 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }
```
**Exponential backoff:** Wait before retrying, with increasing delays. `200 * 2^0 = 200ms`, `200 * 2^1 = 400ms`, `200 * 2^2 = 800ms`. This gives the server time to recover without hammering it.

`await new Promise(resolve => setTimeout(resolve, delay))` is the standard way to "sleep" in async JavaScript. `continue` goes to the next loop iteration (next retry).

```typescript
    // All retries exhausted
    if (lastError instanceof PaydError) {
      throw lastError;
    }
    throw new PaydNetworkError(
      `Request to ${options.path} failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
      lastError,
    );
  }
```
If we exit the loop without returning, all retries failed. If the last error was already a `PaydError`, just re-throw it. Otherwise, wrap it in a `PaydNetworkError` that includes how many attempts were made.

```typescript
  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }
}
```
**URL builder.** `new URL(path, baseUrl)` handles path joining correctly (handles slashes, relative paths, etc.). Then adds any query parameters. `Object.entries` converts the object into `[key, value]` pairs. Only adds params that aren't null/undefined.

```typescript
// Re-export for the retry check
import { PaydError } from "./errors";
```
This import is at the bottom (unusual placement) because it's only needed for the `instanceof PaydError` check in the retry logic. Placed here to separate it from the main imports.

---

## File 8: `src/resources/collections.ts` — Collection Operations

```typescript
import type { PaydClient } from "../client";
import type {
  MpesaCollectionParams,
  MpesaCollectionResponse,
  // ... all type imports
} from "../types/collections";
import { PaydAPIError } from "../errors";
import { validateKenyaPhone, normalizeKenyaPhone } from "../validators/phone";
import { validateInternationalPhone } from "../validators/phone";
import { validateMpesaAmount, validateCardAmount, validatePositiveAmount } from "../validators/amount";
import { validateRequired, validateEnum } from "../validators/params";
```
Imports are organized by category: types, errors, validators. All validators are imported individually.

```typescript
export class Collections {
  constructor(private readonly client: PaydClient) {}
```
**Shorthand constructor.** `private readonly client: PaydClient` does THREE things: (1) declares a class property `client`, (2) makes it `private` (only accessible inside Collections), (3) makes it `readonly` (can't be changed). The `{}` body is empty because TypeScript automatically assigns the parameter.

**In Python this would be:**
```python
class Collections:
    def __init__(self, client: PaydClient):
        self._client = client
```

### The `mpesa()` method — line by line:

```typescript
  async mpesa(params: MpesaCollectionParams): Promise<MpesaCollectionResponse> {
```
Accepts typed parameters, returns a typed promise.

```typescript
    const username = params.username || this.client.defaults.username;
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;
```
**Default resolution.** If the developer passed a username, use it. Otherwise, fall back to the client's default. The `||` operator returns the right side if the left is falsy (null, undefined, empty string).

```typescript
    validateRequired({ username, callbackUrl, narration: params.narration }, [
      "username",
      "callbackUrl",
      "narration",
    ]);
```
Check that all required fields are present after default resolution. Note: `{ username }` is shorthand for `{ username: username }`.

```typescript
    // Normalize +254 to 0-prefix
    const phoneNumber = normalizeKenyaPhone(params.phoneNumber);
    validateKenyaPhone(phoneNumber);
    validateMpesaAmount(params.amount);
```
Three validation steps: (1) convert +254 to 0 format, (2) validate the phone, (3) validate the amount range. All throw `PaydValidationError` if invalid.

```typescript
    const data = await this.client.request({
      method: "POST",
      path: "/api/v2/payments",
      body: {
        username,
        channel: "MPESA",                  // Hardcoded: tells the API this is M-Pesa
        amount: params.amount,
        phone_number: phoneNumber,          // camelCase → snake_case
        narration: params.narration,
        currency: "KES",                   // Hardcoded: M-Pesa is always KES
        callback_url: callbackUrl,         // camelCase → snake_case
      },
    });
```
**The actual API call.** Notice the naming conversion: the SDK accepts `phoneNumber` (camelCase) but sends `phone_number` (snake_case) to the API. `channel: "MPESA"` and `currency: "KES"` are hardcoded because M-Pesa is always Kenya/KES.

```typescript
    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      paymentMethod: data.payment_method as string,
      transactionReference: resolveTransactionRef(data),
      trackingId: (data.trackingId as string) || "",
      reference: (data.reference as string) || "",
      result: data.result ?? null,
      _raw: data,
    };
  }
```
**Response normalization.** Converts API snake_case fields to SDK camelCase. Uses type assertions (`as string`) to tell TypeScript what type each field is. `|| ""` provides defaults for optional fields. `resolveTransactionRef` handles the fact that different endpoints use different key names. `_raw: data` preserves the original response.

### The `card()` method — key differences:

```typescript
      body: {
        username,
        channel: "card",             // Different channel
        payment_method: "card",      // Additional field
        amount: params.amount,
        phone_number: phoneNumber,
        narration: params.narration,
        currency: "KES",
        callback_url: callbackUrl,
      },
```
Card uses `channel: "card"` and adds `payment_method: "card"`.

```typescript
    // Card responses must include a checkout URL
    const checkoutUrl = data.checkout_url as string;
    if (!checkoutUrl) {
      throw new PaydAPIError(
        200,
        (data.message as string) || "Card collection response missing checkout_url",
        data,
      );
    }
```
**Post-response validation.** Card payments MUST return a checkout URL. If the API succeeds but doesn't include one, something is wrong. The SDK throws an error rather than returning a response with a missing critical field.

### The `panAfrican()` method — key differences:

More fields to validate (networkCode, channelId, currency, transactionChannel). Uses `validateInternationalPhone` instead of Kenya-specific. Posts to `/api/v3/payments` (v3, not v2). Handles optional `redirect_url` and `bank_account` in the response.

```typescript
    let bankAccount: BankAccount | undefined;
    const rawBank = data.bank_account as Record<string, string> | undefined;
    if (rawBank) {
      bankAccount = {
        name: rawBank.name || "",
        branchCode: rawBank.branch_code || "",
        accountNumber: rawBank.account_number || "",
        accountName: rawBank.account_name || "",
        accountReference: rawBank.account_reference || "",
      };
    }
```
Conditionally parses the `bank_account` sub-object if present. Not all Pan-African responses include it — only bank transfer collections.

### The `resolveTransactionRef()` helper:

```typescript
function resolveTransactionRef(data: Record<string, unknown>): string {
  return (
    (data.transaction_reference as string) ||
    (data.correlator_id as string) ||
    (data.payd_transaction_ref as string) ||
    ""
  );
}
```
**Critical function.** The Payd API returns transaction references under different keys depending on the endpoint. This function checks all three known keys in order of priority and returns the first one found. Falls back to empty string.

---

## File 9: `src/resources/payouts.ts` — Payout Operations

Same pattern as Collections but for sending money OUT. Key differences:

**M-Pesa payout:**
- Endpoint: `POST /api/v2/withdrawal` (not `/payments`)
- Includes optional `wallet_type` field (only sent if not "local")
- Response includes `channel` and `amount` fields

```typescript
    if (walletType !== "local") {
      body.wallet_type = walletType;
    }
```
The `wallet_type` field is only included when it's NOT the default ("local"). This keeps request payloads clean.

**Pan-African payout:**
- Requires more fields: `account_holder_name`, `provider_name`, `provider_code`
- Uses endpoint `POST /api/v2/payments` (same as collections — endpoint overloading!)
- The `channel` field is set to the same value as `transaction_channel`

**Merchant payout:**
- Endpoint: `POST /api/v3/withdrawal` (v3, not v2)
- Hardcodes `currency: "KES"`, `channel: "bank"`, `transaction_channel: "bank"`
- Uses `business_account` (Paybill/Till number) and `business_number` (account number)
- Validates phone as international format (requires +254 prefix unlike M-Pesa collections)

---

## File 10: `src/resources/transfers.ts` — P2P Transfers

Simplest resource — only one method.

```typescript
  async send(params: TransferParams): Promise<TransferResponse> {
    const walletType = params.walletType || this.client.defaults.walletType || "local";

    validateRequired(
      { receiverUsername: params.receiverUsername, narration: params.narration },
      ["receiverUsername", "narration"],
    );
    validatePositiveAmount(params.amount);

    if (params.phoneNumber) {
      validateInternationalPhone(params.phoneNumber);
    }
```
Phone is optional for transfers (unlike collections/payouts). It's only validated if provided.

```typescript
    const body: Record<string, unknown> = {
      receiver_username: params.receiverUsername,
      amount: params.amount,
      narration: params.narration,
    };

    if (params.phoneNumber) { body.phone_number = params.phoneNumber; }
    if (params.currency) { body.currency = params.currency; }
    if (walletType !== "local") { body.wallet_type = walletType; }
```
**Conditional field inclusion.** Only adds optional fields if they have values. This keeps the request body minimal.

---

## File 11: `src/resources/networks.ts` — Network Discovery

The most complex resource because it transforms raw API data into rich objects with helper methods.

```typescript
  async discover(
    transactionType: TransactionType,
    dialCode: string,
  ): Promise<NetworkDiscoveryResponse> {
    validateRequired({ transactionType, dialCode }, ["transactionType", "dialCode"]);
    validateEnum(transactionType, ["receipt", "withdrawal"], "transactionType");

    if (!dialCode.startsWith("+")) {
      throw new PaydValidationError(
        `dialCode must start with + (e.g., "+234"). Got: "${dialCode}"`,
        "dialCode",
      );
    }
```
Extra validation: dial code must start with `+`. This catches a common mistake.

```typescript
    const data = (await this.client.request({
      method: "GET",
      path: "/v2/networks/grouped",    // Note: NO /api prefix! This endpoint is different.
      query: {
        transaction_type: transactionType,
        dial_code: dialCode,
      },
    })) as unknown as RawNetworkDiscoveryResponse;
```
GET request with query parameters. `as unknown as RawNetworkDiscoveryResponse` is a double cast — first to `unknown` (break the type), then to the target type. Needed because the raw API response shape differs from the SDK's internal types.

```typescript
    return buildNetworkDiscoveryResponse(data);
```
Delegates transformation to a separate function.

### The transformation functions:

```typescript
function buildNetworkDiscoveryResponse(raw: RawNetworkDiscoveryResponse): NetworkDiscoveryResponse {
  const defaults = (raw.defaults || []).map(transformNetwork);
  const mobile = (raw.mobile || []).map(enrichNetwork);
  const banks = (raw.banks || []).map(enrichNetwork);
```
`|| []` handles the case where the API returns null/undefined for an array. `.map()` transforms each network object. `defaults` get basic transformation; `mobile` and `banks` get enriched with helper methods.

```typescript
  return {
    defaults,
    mobile,
    banks,

    findMobile(name: string): NetworkWithHelpers {
      const lower = name.toLowerCase();
      const found = mobile.find((n) => n.name.toLowerCase().includes(lower));
      if (!found) {
        const available = mobile.map((n) => n.name).join(", ");
        throw new PaydValidationError(
          `No mobile network found matching "${name}". Available: ${available || "none"}`,
        );
      }
      return found;
    },
```
**`findMobile`** is a helper method ATTACHED to the response object. It searches by name using case-insensitive partial matching (`.includes()`). If not found, it lists all available networks in the error — extremely helpful for debugging.

```typescript
    findBank(name: string): NetworkWithHelpers {
      // Same pattern as findMobile but searches banks array
    },
  };
}
```

```typescript
function transformNetwork(raw: RawNetwork): Network {
  return {
    id: raw.id,
    code: raw.code,
    updatedAt: raw.updated_at,           // snake_case → camelCase
    status: raw.status,
    accountNumberType: raw.account_number_type as AccountType,
    country: raw.country,
    name: raw.name,
    channelIds: raw.channel_ids || [],
    selectedChannelId: raw.selected_channel_id,
    countryAccountNumberType: raw.country_account_number_type,
    minAmount: raw.min_amount,
    maxAmount: raw.max_amount,
  };
}
```
Converts a raw snake_case network from the API into a clean camelCase object.

```typescript
function enrichNetwork(raw: RawNetwork): NetworkWithHelpers {
  const network = transformNetwork(raw);

  return {
    ...network,                          // Spread: copy all fields from network
    toPaymentParams(): NetworkPaymentParams {
      return {
        networkCode: network.id,             // id → networkCode
        channelId: network.selectedChannelId, // selectedChannelId → channelId
        transactionChannel: network.accountNumberType,
        providerName: network.name,
        providerCode: network.code,
      };
    },
  };
}
```
**`toPaymentParams()`** is the key helper. It extracts exactly the fields you need for a Pan-African payment request and renames them. This means you can do:
```typescript
const mtn = networks.findMobile("MTN");
await payd.collections.panAfrican({ ...mtn.toPaymentParams(), amount: 1800, ... });
```
Without it, you'd have to manually map `network.id` → `networkCode`, `network.selectedChannelId` → `channelId`, etc.

---

## File 12: `src/resources/transactions.ts` — Transaction Status

```typescript
  async getStatus(transactionReference: string): Promise<TransactionStatusResponse> {
    validateRequired({ transactionReference }, ["transactionReference"]);

    const data = await this.client.request({
      method: "GET",
      path: `/api/v1/status/${encodeURIComponent(transactionReference)}`,
    });
```
`encodeURIComponent` is critical — transaction references can contain dots and special characters (e.g., `9BD12041887.eS`). Without encoding, the dot could be interpreted as a file extension by the server.

```typescript
    const rawDetails = data.transaction_details as Record<string, unknown> || {};
    const processedAt = rawDetails.processed_at as Record<string, number> || {};

    const transactionDetails: TransactionDetails = {
      payer: (rawDetails.payer as string) || "",
      merchantId: (rawDetails.merchant_id as string) || "",
      // ... all fields
    };
```
The response has a nested `transaction_details` object. The SDK flattens/normalizes it with default empty strings for missing fields.

---

## File 13: `src/resources/balances.ts` — Account Balances

Simplest resource besides transfers.

```typescript
  async getAll(username?: string): Promise<BalancesResponse> {
    const resolvedUsername = username || this.client.defaults.username;
    validateRequired({ username: resolvedUsername }, ["username"]);

    const data = await this.client.request({
      method: "GET",
      path: `/api/v1/accounts/${encodeURIComponent(resolvedUsername!)}/all_balances`,
    });
```
`resolvedUsername!` — the `!` is TypeScript's "non-null assertion operator." It tells the compiler "I know this isn't null" (we just validated it). Without it, TypeScript would complain that `resolvedUsername` might be undefined.

---

## File 14: `src/webhooks.ts` — Webhook Parsing & Verification

```typescript
import { createHmac } from "node:crypto";
```
Imports Node.js's built-in HMAC function. **In Python:** `import hmac, hashlib`.

### `parseEvent()`:

```typescript
  parseEvent(body: string | Record<string, unknown>): WebhookEvent {
    let data: Record<string, unknown>;

    if (typeof body === "string") {
      try {
        data = JSON.parse(body) as Record<string, unknown>;
      } catch {
        throw new PaydValidationError("Invalid JSON in webhook body");
      }
    } else if (body && typeof body === "object") {
      data = body;
    } else {
      throw new PaydValidationError("Webhook body must be a JSON string or object");
    }
```
Accepts either a JSON string (raw request body) or an already-parsed object (common in Express when using body-parser). Handles both gracefully.

```typescript
    const transactionReference = (data.transaction_reference as string) || "";
    const resultCode = (data.result_code as number) ?? -1;
    const success = data.success as boolean;
```
Extract key fields. `result_code` defaults to `-1` if missing (not 0, which would mean success).

```typescript
    return {
      transactionReference,
      resultCode,
      remarks: (data.remarks as string) || "",
      // ... all other fields ...

      // Derived fields
      isSuccess: resultCode === 0 && success === true,
      transactionType: deriveTransactionType(transactionReference),

      _raw: data,
    };
```
**Two derived convenience fields:**
- `isSuccess`: combines `result_code === 0` AND `success === true`. Both must be true.
- `transactionType`: derived from the reference suffix (see below).

### `verify()`:

```typescript
  verify(body: string, signature: string, secret: string): boolean {
    if (!body || !signature || !secret) {
      throw new PaydWebhookVerificationError(
        "body, signature, and secret are all required for webhook verification.",
      );
    }
```
Guard: all three inputs are required.

```typescript
    // Normalize body: parse and re-serialize with sorted keys
    let normalizedBody: string;
    try {
      const parsed = JSON.parse(body);
      normalizedBody = JSON.stringify(parsed, Object.keys(parsed).sort());
    } catch {
      normalizedBody = body;
    }
```
**Key normalization.** JSON key order isn't guaranteed. The signing service might produce `{"a":1,"b":2}` but the webhook might arrive as `{"b":2,"a":1}`. By parsing and re-serializing with sorted keys, both sides compute the same hash.

`JSON.stringify(parsed, Object.keys(parsed).sort())` — the second argument to `JSON.stringify` is a "replacer" that can be an array of keys. When it's an array, only those keys are included, in that order.

```typescript
    const expectedSignature = createHmac("sha256", secret)
      .update(normalizedBody)
      .digest("hex");
```
**HMAC-SHA256:** Creates a hash using the secret as the key and the body as the message. `.digest("hex")` outputs as a hexadecimal string.

**In Python:** `hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()`

```typescript
    // Timing-safe comparison
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      throw new PaydWebhookVerificationError();
    }

    const { timingSafeEqual } = require("node:crypto");
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new PaydWebhookVerificationError();
    }
```
**Timing-safe comparison is a security measure.** Normal string comparison (`===`) returns as soon as it finds a mismatch. An attacker can measure response times to guess the correct signature one character at a time. `timingSafeEqual` always takes the same amount of time regardless of where the mismatch is, preventing this attack.

**In Python:** `hmac.compare_digest(a, b)` does the same thing.

### `deriveTransactionType()`:

```typescript
function deriveTransactionType(reference: string): TransactionKind {
  if (!reference) return "unknown";

  if (reference.endsWith("eR")) return "receipt";      // Collection/payin
  if (reference.endsWith("eW")) return "withdrawal";   // Payout
  if (reference.endsWith("eS")) return "transfer";     // P2P transfer
  if (reference.endsWith("eT")) return "topup";        // Account topup

  // Handle the ".eS" format seen in transfer responses
  if (reference.includes(".eS")) return "transfer";

  return "unknown";
}
```
Payd encodes the transaction type in the reference string suffix. `"9BD103350408eR"` → the `eR` means it's a receipt (collection). This function decodes that suffix. The `.eS` format is a variant seen in some transfer responses.

---

## File 15: `src/index.ts` — Public API Barrel File

```typescript
// Main client
export { PaydClient } from "./client";

// Errors
export {
  PaydError,
  PaydAuthenticationError,
  PaydValidationError,
  PaydAPIError,
  PaydNetworkError,
  PaydWebhookVerificationError,
} from "./errors";

// Resource classes (for type imports)
export { Collections } from "./resources/collections";
// ... all resource classes ...

// Types — Collections
export type {
  MpesaCollectionParams,
  MpesaCollectionResponse,
  // ...
} from "./types/collections";

// Validators (for advanced use)
export { validateKenyaPhone, validateInternationalPhone, normalizeKenyaPhone } from "./validators/phone";
```
**Barrel file pattern.** This is the single entry point. Instead of:
```typescript
import { PaydClient } from "payd-node-sdk/dist/client";
import { PaydError } from "payd-node-sdk/dist/errors";
```
Developers just write:
```typescript
import { PaydClient, PaydError } from "payd-node-sdk";
```

The `export type` keyword ensures type-only exports are tree-shaken at compile time — they add zero bytes to the runtime bundle.

---

## Config Files Explained

### `tsup.config.ts` — Build Configuration
```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],   // Single entry point (the barrel file)
  format: ["cjs", "esm"],    // Output both CommonJS and ES Modules
  dts: true,                 // Generate .d.ts type definition files
  splitting: false,          // Don't code-split (single file output)
  sourcemap: true,           // Generate .map files for debugging
  clean: true,               // Delete old dist/ before building
  minify: false,             // Keep code readable (not for browsers)
  target: "node18",          // Compile for Node.js 18+
  outDir: "dist",            // Output to dist/
});
```
tsup is a fast bundler built on esbuild. It produces `dist/index.js` (ESM), `dist/index.cjs` (CommonJS), and `dist/index.d.ts` (types).

### `vitest.config.ts` — Test Configuration
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,                      // Makes describe/it/expect available without imports
    environment: "node",                // Run in Node.js environment
    include: ["tests/**/*.test.ts"],    // Find test files
    coverage: {
      provider: "v8",                   // Use V8's built-in coverage
      include: ["src/**/*.ts"],         // Measure coverage for source files
      exclude: ["src/types/**"],        // Don't count type-only files
    },
  },
});
```

### `package.json` key fields:
```json
{
  "type": "module",                    // Use ES modules by default
  "main": "./dist/index.cjs",         // Entry for CommonJS (require())
  "module": "./dist/index.js",        // Entry for ES Modules (import)
  "types": "./dist/index.d.ts",       // Entry for TypeScript types
  "exports": {                         // Modern Node.js resolution
    ".": {
      "import": { "types": "...", "default": "..." },
      "require": { "types": "...", "default": "..." }
    }
  },
  "engines": { "node": ">=18.0.0" },  // Minimum Node.js version
  "files": ["dist", "README.md", "LICENSE"]  // What gets published to npm
}
```

---

## Summary: Architectural Patterns to Replicate

1. **Resource namespacing** — Group operations under `client.collections`, `client.payouts`, etc.
2. **Default resolution** — Client-level defaults reduce repetition: `params.x || client.defaults.x`
3. **Validate-or-throw** — Validators throw errors, don't return booleans
4. **camelCase in, snake_case out** — SDK uses language convention, API uses snake_case
5. **Dual error check** — Always check both HTTP status AND `success` field
6. **Unified transaction reference** — Check all known keys: `transaction_reference`, `correlator_id`, `payd_transaction_ref`
7. **`_raw` escape hatch** — Every response includes the original API response
8. **Phone normalization** — Auto-convert +254 to 0-prefix for Kenya
9. **Exponential backoff** — Retry transient errors with increasing delays
10. **Rich Network Discovery** — `findMobile()`, `findBank()`, `toPaymentParams()` helpers

---

## Critical Files to Modify/Create

| File | Action |
|---|---|
| `python/pyproject.toml` | CREATE — package metadata, dependencies |
| `python/payd/__init__.py` | CREATE — public exports |
| `python/payd/client.py` | CREATE — PaydClient, HTTP layer |
| `python/payd/errors.py` | CREATE — 6 error classes |
| `python/payd/webhooks.py` | CREATE — parse_event, verify, construct_event |
| `python/payd/resources/collections.py` | CREATE — mpesa, card, pan_african |
| `python/payd/resources/payouts.py` | CREATE — mpesa, pan_african, merchant |
| `python/payd/resources/transfers.py` | CREATE — send |
| `python/payd/resources/networks.py` | CREATE — discover with helpers |
| `python/payd/resources/transactions.py` | CREATE — get_status |
| `python/payd/resources/balances.py` | CREATE — get_all |
| `python/payd/validators/phone.py` | CREATE — kenya + international validation |
| `python/payd/validators/amount.py` | CREATE — mpesa, card, positive validation |
| `python/payd/validators/params.py` | CREATE — required, enum validation |
| `python/tests/test_*.py` | CREATE — tests using shared/fixtures |
| `shared/fixtures/**/*.json` | READ ONLY — use as test fixtures |

## Verification Plan

1. **Unit tests:** `cd python && pytest -v` — all tests pass
2. **Type checking:** `mypy payd/` or `pyright` — no type errors
3. **Import test:** `python -c "from payd import PaydClient; print('OK')"`
4. **Fixture contract:** Tests load JSON from `shared/fixtures/` and verify SDK parses them correctly
5. **Manual test with test-app:** Update test-app to optionally call Python SDK (or create a Python equivalent test script)
