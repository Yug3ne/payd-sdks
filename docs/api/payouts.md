# Payouts API

Payout (disbursement) operations — send money to recipients. Access via `payd.payouts`.

## Methods

### `mpesa(params)`

Send money to an M-Pesa user in Kenya.

**Endpoint:** `POST /api/v2/withdrawal`

```typescript
const result = await payd.payouts.mpesa(params: MpesaPayoutParams): Promise<MpesaPayoutResponse>;
```

#### MpesaPayoutParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phoneNumber` | `string` | Yes | Recipient's Kenyan phone: `0XXXXXXXXX` or `+254XXXXXXXXX` |
| `amount` | `number` | Yes | Amount in KES (10 – 250,000) |
| `narration` | `string` | Yes | Payout description |
| `callbackUrl` | `string` | Yes* | Webhook URL |
| `walletType` | `"local" \| "USD"` | No | Funding wallet (default: `"local"`) |

#### MpesaPayoutResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether payout was initiated |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `transactionReference` | `string` | Unique transaction reference |
| `channel` | `string` | `"MPESA"` |
| `amount` | `number` | Payout amount |
| `_raw` | `Record<string, unknown>` | Raw API response |

---

### `panAfrican(params)`

Send money to a mobile wallet or bank account across Africa.

**Endpoint:** `POST /api/v2/payments`

```typescript
const result = await payd.payouts.panAfrican(params: PanAfricanPayoutParams): Promise<PanAfricanPayoutResponse>;
```

#### PanAfricanPayoutParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes* | Payd account username |
| `networkCode` | `string` | Yes | From network discovery |
| `accountName` | `"bank" \| "phone"` | Yes | Account type |
| `accountHolderName` | `string` | Yes | Recipient's full name |
| `accountNumber` | `string` | Yes | Bank account or mobile money number |
| `amount` | `number` | Yes | Amount in target currency (> 0) |
| `phoneNumber` | `string` | Yes | Phone with country code (`+XXXXXXXXX`) |
| `channelId` | `string` | Yes | From network discovery |
| `narration` | `string` | Yes | Payout description |
| `currency` | `string` | Yes | ISO currency code (e.g., `NGN`) |
| `callbackUrl` | `string` | Yes* | Webhook URL |
| `transactionChannel` | `"bank" \| "phone"` | Yes | Must match network type |
| `providerName` | `string` | Yes | Provider name from network discovery |
| `providerCode` | `string` | Yes | Provider code from network discovery |
| `walletType` | `"local" \| "USD"` | No | Funding wallet (default: `"local"`) |

#### PanAfricanPayoutResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether payout was initiated |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `transactionReference` | `string` | Unique transaction reference |
| `channel` | `string` | Payment channel |
| `amount` | `number` | Payout amount |
| `_raw` | `Record<string, unknown>` | Raw API response |

---

### `merchant(params)`

Pay to an M-Pesa Paybill or Till number in Kenya.

**Endpoint:** `POST /api/v3/withdrawal`

```typescript
const result = await payd.payouts.merchant(params: MerchantPayoutParams): Promise<MerchantPayoutResponse>;
```

#### MerchantPayoutParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes* | Payd account username |
| `amount` | `number` | Yes | Amount in KES (> 0) |
| `phoneNumber` | `string` | Yes | Phone with country code (`+254XXXXXXXXX`) |
| `narration` | `string` | Yes | Payment description |
| `businessAccount` | `string` | Yes | Paybill or Till number |
| `businessNumber` | `string` | Yes | Account number (Paybill) or `"N/A"` (Till) |
| `callbackUrl` | `string` | Yes* | Webhook URL |
| `walletType` | `"local" \| "USD"` | No | Funding wallet (default: `"local"`) |

#### MerchantPayoutResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether payment was initiated |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `transactionReference` | `string` | Unique transaction reference |
| `channel` | `string` | Payment channel |
| `amount` | `number` | Payment amount |
| `_raw` | `Record<string, unknown>` | Raw API response |

---

*Fields marked with **\*** fall back to client defaults if empty.
