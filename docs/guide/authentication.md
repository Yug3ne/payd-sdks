# Authentication

## How Authentication Works

The Payd API uses **HTTP Basic Authentication**. The SDK handles this automatically — you provide your API credentials when creating the client, and every request includes the correct `Authorization` header.

```typescript
const payd = new PaydClient({
  apiUsername: "your_api_username",  // HTTP Basic Auth username
  apiPassword: "your_api_password", // HTTP Basic Auth password
});
```

Under the hood, the SDK:

1. Base64-encodes `apiUsername:apiPassword`
2. Adds an `Authorization: Basic <encoded>` header to every request
3. Also sends `Content-Type: application/json` and `Accept: application/json`

## Two Types of "Username"

Payd has two distinct username concepts — this is the most common source of confusion:

| Concept | Constructor Option | Purpose |
|---------|-------------------|---------|
| **API Username** | `apiUsername` | Authenticates your HTTP requests (Basic Auth) |
| **Payd Account Username** | `defaultUsername` | Identifies which Payd account to collect into / pay from |

```typescript
const payd = new PaydClient({
  apiUsername: "api_user_abc",       // For HTTP auth
  apiPassword: "api_pass_xyz",      // For HTTP auth
  defaultUsername: "my_payd_user",   // Which account to use
});
```

The **Payd account username** can also be passed per-request:

```typescript
// This overrides defaultUsername for this specific request
await payd.collections.mpesa({
  username: "other_payd_user",
  // ...
});
```

## Credential Validation

The SDK validates credentials at construction time:

```typescript
// Throws PaydAuthenticationError immediately
const payd = new PaydClient({
  apiUsername: "",   // Empty!
  apiPassword: "",  // Empty!
});
// => PaydAuthenticationError: "apiUsername and apiPassword are required..."
```

If the API returns a **401 Unauthorized** response, the SDK throws a `PaydAuthenticationError`:

```typescript
try {
  await payd.collections.mpesa({ /* ... */ });
} catch (error) {
  if (error instanceof PaydAuthenticationError) {
    console.error("Bad API credentials — check apiUsername and apiPassword");
  }
}
```

## Security Best Practices

::: danger Never hardcode credentials
Always use environment variables or a secrets manager. Never commit API credentials to version control.
:::

```typescript
// Good
const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
});

// Bad - never do this
const payd = new PaydClient({
  apiUsername: "hardcoded_user",    // Don't!
  apiPassword: "hardcoded_pass",   // Don't!
});
```

**Recommended practices:**

1. Store credentials in environment variables
2. Use a `.env` file for local dev (and add it to `.gitignore`)
3. Use your platform's secrets manager in production (e.g., AWS Secrets Manager, Vercel Environment Variables, Railway Secrets)
4. Rotate credentials periodically
5. Use separate credentials for development and production
