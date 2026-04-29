# Transactions API

Transaction status lookup operations. Access via `payd.transactions`.

## Methods

### `getStatus(transactionReference)`

Look up the full details and current status of any Payd transaction.

**Endpoint:** `GET /api/v1/status/{transactionReference}`

```typescript
const result = await payd.transactions.getStatus(
  transactionReference: string
): Promise<TransactionStatusResponse>;
```

#### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `transactionReference` | `string` | The Payd transaction reference (e.g., `"9BD103350408eR"`) |

#### TransactionStatusResponse

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Transaction UUID |
| `accountId` | `string` | Account UUID |
| `billingCurrency` | `string` | Billing currency code |
| `currency` | `string` | Transaction currency |
| `code` | `string` | Transaction reference code |
| `conversionRate` | `number` | Currency conversion rate |
| `amount` | `number` | Transaction amount |
| `billingCurrencyAmount` | `number` | Amount in billing currency |
| `balance` | `number` | Account balance after transaction |
| `type` | `string` | `"receipt"`, `"withdrawal"`, `"transfer"`, `"topup"` |
| `transactionDetails` | `TransactionDetails` | Detailed transaction info |
| `transactionCategory` | `string` | Transaction category |
| `userId` | `string` | User identifier |
| `requestMetadata` | `unknown` | Request metadata |
| `createdAt` | `string` | ISO timestamp |
| `transactionReference` | `string` | Alias for `code` |
| `_raw` | `Record<string, unknown>` | Raw API response |

#### TransactionDetails

| Field | Type | Description |
|-------|------|-------------|
| `payer` | `string` | Payer identifier |
| `merchantId` | `string` | Merchant identifier |
| `phoneNumber` | `string` | Phone number |
| `processedAt` | `ProcessedAt` | Processing timestamp |
| `reason` | `string` | Transaction reason |
| `channel` | `string` | Payment channel (e.g., `"MPESA"`) |
| `accountNumber` | `string` | Account number |
| `status` | `string` | Transaction status (e.g., `"success"`) |
| `receiver` | `string` | Receiver identifier |
| `emailAddress` | `string` | Email address |

#### ProcessedAt

| Field | Type | Description |
|-------|------|-------------|
| `seconds` | `number` | Unix seconds |
| `nanos` | `number` | Nanoseconds |
