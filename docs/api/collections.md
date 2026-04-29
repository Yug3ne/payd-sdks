# Collections API

Collection (payin) operations — collect payments from customers. Access via `payd.collections`.

## Methods

### `mpesa(params)`

Collect a payment via Kenya M-Pesa STK Push.

**Endpoint:** `POST /api/v2/payments`

```typescript
const result = await payd.collections.mpesa(params: MpesaCollectionParams): Promise<MpesaCollectionResponse>;
```

#### MpesaCollectionParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes* | Payd account username |
| `amount` | `number` | Yes | Amount in KES (10 – 250,000) |
| `phoneNumber` | `string` | Yes | Kenyan phone: `0XXXXXXXXX` or `+254XXXXXXXXX` |
| `narration` | `string` | Yes | Description shown to customer |
| `callbackUrl` | `string` | Yes* | Webhook URL |

#### MpesaCollectionResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether STK push was initiated |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `paymentMethod` | `string` | `"MPESA"` |
| `transactionReference` | `string` | Unique transaction reference |
| `trackingId` | `string` | Tracking identifier |
| `reference` | `string` | Additional reference |
| `result` | `unknown` | Additional result data |
| `_raw` | `Record<string, unknown>` | Raw API response |

---

### `card(params)`

Accept a card payment via hosted checkout.

**Endpoint:** `POST /api/v2/payments`

```typescript
const result = await payd.collections.card(params: CardCollectionParams): Promise<CardCollectionResponse>;
```

#### CardCollectionParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes* | Payd account username |
| `amount` | `number` | Yes | Amount in KES (min 100) |
| `phoneNumber` | `string` | Yes | Kenyan phone: `0XXXXXXXXX` or `+254XXXXXXXXX` |
| `narration` | `string` | Yes | Payment description |
| `callbackUrl` | `string` | Yes* | Webhook URL |

#### CardCollectionResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether checkout was created |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `paymentMethod` | `string` | `"card"` |
| `checkoutUrl` | `string` | Hosted checkout URL — redirect customer here |
| `transactionReference` | `string` | Unique transaction reference |
| `trackingId` | `string` | Tracking identifier |
| `reference` | `string` | Additional reference |
| `result` | `unknown` | Additional result data |
| `_raw` | `Record<string, unknown>` | Raw API response |

**Throws:** `PaydAPIError` if the response does not contain a `checkoutUrl`.

---

### `panAfrican(params)`

Collect via Pan-African mobile money or bank transfer.

**Endpoint:** `POST /api/v3/payments`

```typescript
const result = await payd.collections.panAfrican(params: PanAfricanCollectionParams): Promise<PanAfricanCollectionResponse>;
```

#### PanAfricanCollectionParams

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes* | Payd account username |
| `accountName` | `"bank" \| "phone"` | Yes | Account type |
| `amount` | `number` | Yes | Amount in target currency (> 0) |
| `phoneNumber` | `string` | Yes | Phone with country code (`+XXXXXXXXX`) |
| `accountNumber` | `string` | Yes | Mobile money or bank account number |
| `networkCode` | `string` | Yes | From network discovery |
| `channelId` | `string` | Yes | From network discovery |
| `narration` | `string` | Yes | Payment description |
| `currency` | `string` | Yes | ISO currency code (e.g., `NGN`) |
| `callbackUrl` | `string` | Yes* | Webhook URL |
| `transactionChannel` | `"bank" \| "phone"` | Yes | Must match network type |
| `redirectUrl` | `string` | No | Post-checkout redirect URL |

#### PanAfricanCollectionResponse

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether request was accepted |
| `message` | `string` | API message |
| `status` | `string` | Status string |
| `paymentMethod` | `string` | Payment method used |
| `transactionReference` | `string` | Unique transaction reference |
| `bankAccount` | `BankAccount \| undefined` | Bank details (for bank transfers) |
| `checkoutUrl` | `string \| undefined` | Hosted checkout URL (some countries) |
| `trackingId` | `string` | Tracking identifier |
| `reference` | `string` | Additional reference |
| `result` | `unknown` | Additional result data |
| `_raw` | `Record<string, unknown>` | Raw API response |

#### BankAccount

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Bank name |
| `branchCode` | `string` | Branch code |
| `accountNumber` | `string` | Account number |
| `accountName` | `string` | Account holder name |
| `accountReference` | `string` | Payment reference |

---

*Fields marked with **\*** fall back to client defaults if empty. See [Configuration](/guide/configuration).
