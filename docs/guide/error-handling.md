# Error Handling

The SDK uses a structured error hierarchy so you can catch and handle specific error types. All SDK errors extend the base `PaydError` class.

## Error Hierarchy

```
PaydError (base)
├── PaydValidationError      — Client-side validation failure
├── PaydAuthenticationError   — Invalid API credentials (401)
├── PaydAPIError              — API returned an error response
├── PaydNetworkError          — Connection/timeout failure
└── PaydWebhookVerificationError — Webhook signature mismatch
```

## Catching Errors

```typescript
import {
  PaydValidationError,
  PaydAuthenticationError,
  PaydAPIError,
  PaydNetworkError,
} from "payd-node-sdk";

try {
  await payd.collections.mpesa({
    username: "my_user",
    amount: 500,
    phoneNumber: "0700000000",
    narration: "Order #1234",
    callbackUrl: "https://my-server.com/webhook",
  });
} catch (error) {
  if (error instanceof PaydValidationError) {
    // Bad input — fix and retry
    console.log(error.message);  // "phoneNumber must be exactly 10 digits..."
    console.log(error.field);    // "phoneNumber"
  } else if (error instanceof PaydAuthenticationError) {
    // Wrong API credentials
    console.log(error.message);  // "Invalid API credentials..."
  } else if (error instanceof PaydAPIError) {
    // API returned an error
    console.log(error.statusCode); // 400
    console.log(error.message);    // "Insufficient balance"
    console.log(error.detail);     // Raw API response body
  } else if (error instanceof PaydNetworkError) {
    // Connection failed
    console.log(error.message);  // "Request to /api/v2/payments failed..."
    console.log(error.cause);    // Original Error object
  }
}
```

## Error Types in Detail

### PaydValidationError

Thrown **before any HTTP request** when client-side validation fails. This saves a round-trip to the API.

```typescript
// Properties:
error.message  // Human-readable description
error.field    // Which parameter failed (e.g., "phoneNumber", "amount")
error.name     // "PaydValidationError"
```

**Common triggers:**

| Field | Validation | Example Message |
|-------|-----------|-----------------|
| `phoneNumber` | Kenya: 10 digits starting with 0 | `"phoneNumber must be exactly 10 digits starting with 0"` |
| `phoneNumber` | International: starts with +, 7-15 digits | `"phoneNumber must start with + followed by 7-15 digits"` |
| `amount` | M-Pesa: 10 - 250,000 KES | `"amount must be at least 10 for M-Pesa transactions"` |
| `amount` | Card: min 100 KES | `"amount must be at least 100 KES for card payments"` |
| `amount` | Positive number | `"amount must be greater than 0"` |
| Any required field | Non-empty | `"callbackUrl is required and cannot be empty"` |
| Enum fields | Allowed values | `"accountName must be one of: bank, phone"` |

### PaydAuthenticationError

Thrown when API credentials are missing or invalid.

```typescript
// Thrown at construction time:
new PaydClient({ apiUsername: "", apiPassword: "" });
// => "apiUsername and apiPassword are required..."

// Thrown on 401 response:
await payd.collections.mpesa({ /* ... */ });
// => "Invalid API credentials. Check your apiUsername and apiPassword."
```

### PaydAPIError

Thrown when the Payd API returns an error. The SDK checks **both** the HTTP status code and the `success` field — the API sometimes returns HTTP 200 with `success: false`.

```typescript
// Properties:
error.statusCode  // HTTP status code (or from response body)
error.message     // Error message from the API
error.detail      // Full raw response body
error.name        // "PaydAPIError"
```

```typescript
try {
  await payd.payouts.mpesa({ /* ... */ });
} catch (error) {
  if (error instanceof PaydAPIError) {
    console.log(error.statusCode); // 400
    console.log(error.detail);     // { success: false, message: "...", ... }
  }
}
```

### PaydNetworkError

Thrown when the HTTP request fails at the network level (DNS failure, connection refused, timeout, etc.). Only thrown **after all retries are exhausted**.

```typescript
// Properties:
error.message  // Description including retry count
error.cause    // The original Error that caused the failure
error.name     // "PaydNetworkError"
```

### PaydWebhookVerificationError

Thrown when webhook HMAC signature verification fails.

```typescript
try {
  payd.webhooks.verify(body, signature, secret);
} catch (error) {
  if (error instanceof PaydWebhookVerificationError) {
    console.log(error.message); // "Webhook signature verification failed."
  }
}
```

## Catch-All with PaydError

To catch any SDK error without distinguishing the type:

```typescript
import { PaydError } from "payd-node-sdk";

try {
  await payd.collections.mpesa({ /* ... */ });
} catch (error) {
  if (error instanceof PaydError) {
    // Any SDK error
    console.log(`Payd error: ${error.message}`);
  } else {
    // Unexpected error (not from the SDK)
    throw error;
  }
}
```

## Retry Behavior

The SDK automatically retries **transient errors** with exponential backoff:

| Error Type | Retried? |
|------------|----------|
| Network errors (connection, timeout) | Yes |
| 5xx server errors | Yes |
| 4xx client errors | No |
| Authentication errors (401) | No |
| Validation errors | No (never sent) |

**Backoff schedule:** 200ms, 400ms, 800ms (with default `maxRetries: 2`)

After all retries are exhausted, a `PaydNetworkError` is thrown with the original error as `.cause`.

## Practical Pattern

```typescript
import {
  PaydError,
  PaydValidationError,
  PaydAPIError,
  PaydAuthenticationError,
  PaydNetworkError,
} from "payd-node-sdk";

async function handlePayment(amount: number, phone: string) {
  try {
    return await payd.collections.mpesa({
      username: "",
      amount,
      phoneNumber: phone,
      narration: "Payment",
      callbackUrl: "",
    });
  } catch (error) {
    if (error instanceof PaydValidationError) {
      // Client error — return 400 to your user
      return { error: error.message, field: error.field, status: 400 };
    }
    if (error instanceof PaydAuthenticationError) {
      // Config error — alert your team
      console.error("CRITICAL: Payd API credentials invalid");
      return { error: "Payment service unavailable", status: 503 };
    }
    if (error instanceof PaydAPIError) {
      // API rejected the request
      return { error: error.message, status: error.statusCode };
    }
    if (error instanceof PaydNetworkError) {
      // Payd API is down — retry later
      return { error: "Payment service temporarily unavailable", status: 503 };
    }
    throw error; // Unexpected
  }
}
```
