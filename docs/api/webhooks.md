# Webhooks API

Webhook parsing and verification utilities. Access via `payd.webhooks`.

## Methods

### `parseEvent(body)`

Parse a webhook payload into a typed `WebhookEvent`.

```typescript
const event = payd.webhooks.parseEvent(
  body: string | Record<string, unknown>
): WebhookEvent;
```

Accepts either a JSON string or an already-parsed object. Adds derived fields `isSuccess` and `transactionType`.

**Throws:** `PaydValidationError` if the body is not valid JSON or is not a string/object.

---

### `verify(body, signature, secret)`

Verify a webhook signature using HMAC-SHA256.

```typescript
const isValid = payd.webhooks.verify(
  body: string,
  signature: string,
  secret: string
): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `body` | `string` | Raw webhook body string |
| `signature` | `string` | Signature from the `X-Payd-Connect-Signature` header |
| `secret` | `string` | Your webhook signing secret |

**Returns:** `true` if the signature is valid.

**Throws:** `PaydWebhookVerificationError` if verification fails or any parameter is missing.

::: info Signature Algorithm
The SDK normalizes the body by parsing and re-serializing with sorted keys before computing HMAC-SHA256. Comparison uses timing-safe equality to prevent timing attacks.
:::

---

### `constructEvent(body, signature, secret)`

Verify and parse a webhook in a single step.

```typescript
const event = payd.webhooks.constructEvent(
  body: string,
  signature: string,
  secret: string
): WebhookEvent;
```

Equivalent to calling `verify()` then `parseEvent()`.

**Throws:** `PaydWebhookVerificationError` if the signature is invalid.

## WebhookEvent

```typescript
interface WebhookEvent {
  transactionReference: string;
  resultCode: number;
  remarks: string;
  thirdPartyTransId?: string;
  amount?: number;
  transactionDate?: string;
  forwardUrl?: string;
  orderId?: string;
  userId?: string;
  customerName?: string;
  success: boolean;
  status?: string;
  phoneNumber?: string;
  web3TransactionReference?: string;

  // Derived fields
  isSuccess: boolean;
  transactionType: TransactionKind;

  _raw: Record<string, unknown>;
}
```

### Derived Fields

| Field | Derivation | Description |
|-------|-----------|-------------|
| `isSuccess` | `resultCode === 0 && success === true` | Whether the transaction succeeded |
| `transactionType` | From reference suffix | `"receipt"`, `"withdrawal"`, `"transfer"`, `"topup"`, or `"unknown"` |

### Transaction Type Suffixes

| Suffix | Type |
|--------|------|
| `eR` | `"receipt"` |
| `eW` | `"withdrawal"` |
| `eS` | `"transfer"` |
| `eT` | `"topup"` |
