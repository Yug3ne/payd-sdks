# Transfers API

Payd-to-Payd transfer operations — send money instantly between Payd accounts. Access via `payd.transfers`.

## Methods

### `send(params)`

Send money instantly between Payd accounts.

**Endpoint:** `POST /api/v2/p2p`

```typescript
const result = await payd.transfers.send(params: TransferParams): Promise<TransferResponse>;
```

#### TransferParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receiverUsername` | `string` | Yes | Payd username of the recipient |
| `amount` | `number` | Yes | Amount to transfer (> 0) |
| `narration` | `string` | Yes | Transfer description |
| `phoneNumber` | `string` | No | Recipient's phone with country code |
| `currency` | `string` | No | Currency code (auto-converts if different) |
| `walletType` | `"local" \| "USD"` | No | Funding wallet (default: `"local"`) |

#### TransferResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether transfer completed |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `transactionReference` | `string` | Unique transaction reference |
| `trackingId` | `string` | Tracking identifier |
| `reference` | `string` | Additional reference |
| `result` | `unknown` | Additional result data |
| `_raw` | `Record<string, unknown>` | Raw API response |

## Notes

- Transfers are **instant** — funds arrive immediately
- No callback URL is required (unlike collections/payouts)
- The `phoneNumber` field is optional and used for identification only
- Payd auto-converts currencies if the sender and receiver use different currencies
