# Configuration

## Client Options

The `PaydClient` constructor accepts a `PaydClientOptions` object with the following properties:

```typescript
const payd = new PaydClient({
  // Required
  apiUsername: "your_api_username",
  apiPassword: "your_api_password",

  // Optional
  baseUrl: "https://api.payd.money",   // API base URL
  timeout: 30000,                       // Request timeout (ms)
  walletType: "local",                  // Default wallet: "local" or "USD"
  defaultCallbackUrl: "https://...",    // Fallback webhook URL
  defaultUsername: "my_payd_user",      // Fallback Payd account username
  debug: false,                         // Log all requests/responses
  maxRetries: 2,                        // Retry count for transient errors
});
```

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `apiUsername` | `string` | Your Payd API username (used for HTTP Basic Auth) |
| `apiPassword` | `string` | Your Payd API password (used for HTTP Basic Auth) |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `"https://api.payd.money"` | Base URL for the Payd API |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `walletType` | `"local" \| "USD"` | `"local"` | Default wallet for payouts/transfers |
| `defaultCallbackUrl` | `string` | — | Fallback webhook URL if not specified per-request |
| `defaultUsername` | `string` | — | Fallback Payd username if not specified per-request |
| `debug` | `boolean` | `false` | Enable debug logging to console |
| `maxRetries` | `number` | `2` | Number of retries for transient (5xx/network) errors |

## Client Defaults

Once initialized, the client exposes a `defaults` object that resource methods use as fallbacks:

```typescript
const payd = new PaydClient({
  apiUsername: "...",
  apiPassword: "...",
  defaultUsername: "my_user",
  defaultCallbackUrl: "https://my-server.com/webhook",
  walletType: "USD",
});

// These are accessible at:
payd.defaults.username;    // "my_user"
payd.defaults.callbackUrl; // "https://my-server.com/webhook"
payd.defaults.walletType;  // "USD"
```

When a resource method (e.g., `collections.mpesa()`) receives an empty `username` or `callbackUrl`, it automatically falls back to these defaults. This means you can set them once and omit them from every request:

```typescript
// No need to pass username or callbackUrl — defaults are used
const result = await payd.collections.mpesa({
  username: "",       // falls back to defaultUsername
  amount: 500,
  phoneNumber: "0700000000",
  narration: "Order #1234",
  callbackUrl: "",    // falls back to defaultCallbackUrl
});
```

## Wallet Types

Payd accounts have two wallets:

| Wallet | Description |
|--------|-------------|
| `"local"` | Local currency wallet (e.g., KES). Used by default. |
| `"USD"` | USD wallet. The amount in payout/transfer requests is still specified in local currency — Payd converts at current rates. |

Set the wallet type globally:

```typescript
const payd = new PaydClient({
  // ...
  walletType: "USD", // All payouts/transfers funded from USD wallet
});
```

Or override per-request:

```typescript
await payd.payouts.mpesa({
  phoneNumber: "0700000000",
  amount: 500,          // 500 KES
  narration: "Payment",
  callbackUrl: "...",
  walletType: "USD",    // Fund this specific payout from USD wallet
});
```

## Debug Mode

Enable debug mode to log every HTTP request and response to the console:

```typescript
const payd = new PaydClient({
  apiUsername: "...",
  apiPassword: "...",
  debug: true,
});
```

Output:

```
[Payd SDK] POST https://api.payd.money/api/v2/payments
[Payd SDK] Body: {
  "username": "my_user",
  "channel": "MPESA",
  "amount": 500,
  ...
}
[Payd SDK] Response: 200 OK
[Payd SDK] Data: {
  "success": true,
  "transaction_reference": "9BD103350408eR",
  ...
}
```

::: warning
Never enable debug mode in production — it logs full request/response bodies which may contain sensitive data.
:::

## Retry Behavior

The SDK automatically retries failed requests for **transient errors** (5xx responses and network failures):

- **Default retries:** 2 (so up to 3 total attempts)
- **Backoff strategy:** Exponential — 200ms, 400ms, 800ms...
- **Not retried:** Client errors (4xx), authentication errors (401), validation errors

```typescript
const payd = new PaydClient({
  apiUsername: "...",
  apiPassword: "...",
  maxRetries: 3, // Up to 4 total attempts
});
```

Set `maxRetries: 0` to disable retries entirely.

## Environment Variables

We recommend storing credentials in environment variables:

```bash
export PAYD_API_USERNAME="your_api_username"
export PAYD_API_PASSWORD="your_api_password"
export PAYD_USERNAME="your_payd_account_username"
```

```typescript
const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: process.env.PAYD_USERNAME!,
});
```

::: tip
Use a `.env` file with a package like `dotenv` for local development. Make sure `.env` is in your `.gitignore`.
:::
