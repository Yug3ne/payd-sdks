# Networks API

Network discovery operations — discover available payment networks per country. Access via `payd.networks`.

## Methods

### `discover(transactionType, dialCode)`

Discover available payment networks for a specific country.

**Endpoint:** `GET /v2/networks/grouped`

```typescript
const result = await payd.networks.discover(
  transactionType: "receipt" | "withdrawal",
  dialCode: string
): Promise<NetworkDiscoveryResponse>;
```

#### Parameters

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `transactionType` | `string` | `"receipt"`, `"withdrawal"` | `"receipt"` for collections, `"withdrawal"` for payouts |
| `dialCode` | `string` | e.g., `"+234"` | Country dial code with `+` prefix |

**Throws:** `PaydValidationError` if `dialCode` doesn't start with `+`.

#### NetworkDiscoveryResponse

| Field | Type | Description |
|-------|------|-------------|
| `defaults` | `Network[]` | Default/recommended networks |
| `mobile` | `NetworkWithHelpers[]` | Mobile money networks |
| `banks` | `NetworkWithHelpers[]` | Bank networks |

**Methods on the response:**

| Method | Returns | Description |
|--------|---------|-------------|
| `findMobile(name)` | `NetworkWithHelpers` | Find a mobile network by name (case-insensitive partial match) |
| `findBank(name)` | `NetworkWithHelpers` | Find a bank network by name (case-insensitive partial match) |

Both `findMobile` and `findBank` throw `PaydValidationError` if no match is found.

## Types

### Network

```typescript
interface Network {
  id: string;                          // Network UUID
  code: string;                        // Network code
  updatedAt: string;                   // Last update timestamp
  status: string;                      // Network status
  accountNumberType: "bank" | "phone"; // Network type
  country: string;                     // ISO 2-letter country code
  name: string;                        // Human-readable name
  channelIds: string[];                // Available channel UUIDs
  selectedChannelId: string;           // Recommended channel UUID
  countryAccountNumberType: string;
  minAmount: number;                   // Min transaction amount
  maxAmount: number;                   // Max transaction amount
}
```

### NetworkWithHelpers

Extends `Network` with a helper method:

```typescript
interface NetworkWithHelpers extends Network {
  toPaymentParams(): NetworkPaymentParams;
}
```

### NetworkPaymentParams

Returned by `toPaymentParams()`. Spread into Pan-African collection/payout requests:

```typescript
interface NetworkPaymentParams {
  networkCode: string;               // Network ID
  channelId: string;                 // Selected channel ID
  transactionChannel: "bank" | "phone"; // Account type
  providerName: string;             // Network name
  providerCode: string;             // Network code
}
```

## Usage Pattern

```typescript
// 1. Discover
const networks = await payd.networks.discover("receipt", "+234");

// 2. Find
const mtn = networks.findMobile("MTN");

// 3. Extract params
const params = mtn.toPaymentParams();

// 4. Use in payment
await payd.collections.panAfrican({
  ...params,
  username: "my_user",
  accountName: "phone",
  amount: 1800,
  phoneNumber: "+2340000000000",
  accountNumber: "+2340000000000",
  narration: "Payment",
  currency: "NGN",
  callbackUrl: "https://...",
});
```
