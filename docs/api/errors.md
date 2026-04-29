# Errors API

All SDK errors extend the base `PaydError` class. Import them from `payd-node-sdk`.

```typescript
import {
  PaydError,
  PaydValidationError,
  PaydAuthenticationError,
  PaydAPIError,
  PaydNetworkError,
  PaydWebhookVerificationError,
} from "payd-node-sdk";
```

## Error Classes

### PaydError

Base class for all SDK errors.

```typescript
class PaydError extends Error {
  name: "PaydError";
  message: string;
}
```

---

### PaydValidationError

Client-side validation failure. Thrown **before** any HTTP request is made.

```typescript
class PaydValidationError extends PaydError {
  name: "PaydValidationError";
  field?: string;   // Which parameter failed validation
}
```

**Example:**

```typescript
try {
  await payd.collections.mpesa({ phoneNumber: "123", /* ... */ });
} catch (e) {
  if (e instanceof PaydValidationError) {
    e.message; // "phoneNumber must be exactly 10 digits starting with 0..."
    e.field;   // "phoneNumber"
  }
}
```

---

### PaydAuthenticationError

Invalid API credentials or HTTP 401 response.

```typescript
class PaydAuthenticationError extends PaydError {
  name: "PaydAuthenticationError";
}
```

Default message: `"Invalid API credentials. Check your apiUsername and apiPassword."`

---

### PaydAPIError

API returned an error response (non-2xx HTTP status or `success: false`).

```typescript
class PaydAPIError extends PaydError {
  name: "PaydAPIError";
  statusCode: number;   // HTTP status code
  detail: unknown;      // Raw response body
}
```

**Example:**

```typescript
try {
  await payd.payouts.mpesa({ /* ... */ });
} catch (e) {
  if (e instanceof PaydAPIError) {
    e.statusCode; // 400
    e.message;    // "Insufficient balance"
    e.detail;     // { success: false, message: "...", status: 400 }
  }
}
```

---

### PaydNetworkError

Network-level failure (connection refused, DNS error, timeout). Only thrown after all retries are exhausted.

```typescript
class PaydNetworkError extends PaydError {
  name: "PaydNetworkError";
  cause?: Error;   // Original error
}
```

---

### PaydWebhookVerificationError

Webhook HMAC signature verification failed.

```typescript
class PaydWebhookVerificationError extends PaydError {
  name: "PaydWebhookVerificationError";
}
```

Default message: `"Webhook signature verification failed."`

## Hierarchy

```
Error
 └── PaydError
      ├── PaydValidationError
      ├── PaydAuthenticationError
      ├── PaydAPIError
      ├── PaydNetworkError
      └── PaydWebhookVerificationError
```

## instanceof Checks

All error classes support `instanceof` correctly (prototype chain is properly set):

```typescript
const error = new PaydValidationError("test");
error instanceof PaydValidationError;  // true
error instanceof PaydError;            // true
error instanceof Error;                // true
```
