# Balances API

Account balance operations. Access via `payd.balances`.

## Methods

### `getAll(username?)`

Fetch all account balances including fiat (local currency) and USD wallets.

**Endpoint:** `GET /api/v1/accounts/{username}/all_balances`

```typescript
const result = await payd.balances.getAll(
  username?: string
): Promise<BalancesResponse>;
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | No* | Payd account username |

*Falls back to `defaultUsername` if not provided.

#### BalancesResponse

| Field | Type | Description |
|-------|------|-------------|
| `fiatBalance` | `WalletBalance` | Local currency wallet (e.g., KES) |
| `onchainBalance` | `WalletBalance` | USD wallet |
| `_raw` | `Record<string, unknown>` | Raw API response |

#### WalletBalance

| Field | Type | Description |
|-------|------|-------------|
| `balance` | `number` | Current balance |
| `convertedBalance` | `number` | Balance converted to base currency |
| `currency` | `string` | Currency code (e.g., `"KES"`, `"USD"`) |
