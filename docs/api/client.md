# PaydClient

The main entry point for the Payd SDK. Creates an authenticated client with access to all resource namespaces.

## Constructor

```typescript
import { PaydClient } from "payd-node-sdk";

const payd = new PaydClient(options: PaydClientOptions);
```

### PaydClientOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `apiUsername` | `string` | Yes | — | Payd API username (HTTP Basic Auth) |
| `apiPassword` | `string` | Yes | — | Payd API password (HTTP Basic Auth) |
| `baseUrl` | `string` | No | `"https://api.payd.money"` | API base URL |
| `timeout` | `number` | No | `30000` | Request timeout in milliseconds |
| `walletType` | `"local" \| "USD"` | No | `"local"` | Default wallet for payouts/transfers |
| `defaultCallbackUrl` | `string` | No | — | Fallback webhook URL |
| `defaultUsername` | `string` | No | — | Fallback Payd account username |
| `debug` | `boolean` | No | `false` | Enable debug logging |
| `maxRetries` | `number` | No | `2` | Retry count for transient errors |

**Throws:** `PaydAuthenticationError` if `apiUsername` or `apiPassword` is missing or empty.

## Properties

### `defaults`

```typescript
payd.defaults: {
  walletType?: string;
  callbackUrl?: string;
  username?: string;
}
```

Read-only object containing the default values that resource methods use as fallbacks. Set via the constructor options `walletType`, `defaultCallbackUrl`, and `defaultUsername`.

### Resource Namespaces

| Property | Type | Description |
|----------|------|-------------|
| `payd.collections` | [`Collections`](/api/collections) | Collection (payin) operations |
| `payd.payouts` | [`Payouts`](/api/payouts) | Payout (disbursement) operations |
| `payd.transfers` | [`Transfers`](/api/transfers) | Payd-to-Payd transfer operations |
| `payd.networks` | [`Networks`](/api/networks) | Network discovery |
| `payd.transactions` | [`Transactions`](/api/transactions) | Transaction status lookups |
| `payd.balances` | [`Balances`](/api/balances) | Account balance queries |
| `payd.webhooks` | [`Webhooks`](/api/webhooks) | Webhook parsing & verification |

## Internal Methods

### `request<T>(options: RequestOptions): Promise<T>`

Internal method used by all resource classes. Handles:

- HTTP Basic Auth headers
- JSON serialization/deserialization
- Error mapping (401 → `PaydAuthenticationError`, 5xx → retry, etc.)
- Exponential backoff retries
- Dual error checking (HTTP status + `success` field)

```typescript
interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}
```

::: info
You typically don't need to call `request()` directly — use the resource methods instead.
:::

## Example

```typescript
const payd = new PaydClient({
  apiUsername: process.env.PAYD_API_USERNAME!,
  apiPassword: process.env.PAYD_API_PASSWORD!,
  defaultUsername: "my_payd_user",
  defaultCallbackUrl: "https://my-server.com/webhook",
  walletType: "local",
  timeout: 15000,
  maxRetries: 3,
  debug: process.env.NODE_ENV === "development",
});

// All of these are now available:
await payd.collections.mpesa({ /* ... */ });
await payd.payouts.mpesa({ /* ... */ });
await payd.transfers.send({ /* ... */ });
await payd.networks.discover("receipt", "+234");
await payd.transactions.getStatus("9BD103350408eR");
await payd.balances.getAll();
payd.webhooks.parseEvent(body);
```
