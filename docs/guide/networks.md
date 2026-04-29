# Network Discovery

Discover available payment networks for a specific country before making Pan-African collections or payouts. The network discovery API returns mobile money providers and banks with their configuration.

## Why Network Discovery?

Pan-African operations require several network-specific parameters (`networkCode`, `channelId`, `transactionChannel`, etc.). Rather than hardcoding these, the SDK lets you discover them dynamically:

```typescript
const networks = await payd.networks.discover("receipt", "+234");
const mtn = networks.findMobile("MTN");
const params = mtn.toPaymentParams();
// { networkCode, channelId, transactionChannel, providerName, providerCode }
```

## Basic Usage

```typescript
// Discover collection networks for Nigeria
const networks = await payd.networks.discover("receipt", "+234");

// Discover payout networks for Uganda
const payoutNetworks = await payd.networks.discover("withdrawal", "+256");
```

## Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `transactionType` | `string` | `"receipt"` or `"withdrawal"` | `"receipt"` for collections, `"withdrawal"` for payouts |
| `dialCode` | `string` | e.g., `"+234"` | Country dial code with `+` prefix |

## Response

```typescript
interface NetworkDiscoveryResponse {
  defaults: Network[];              // Default/recommended networks
  mobile: NetworkWithHelpers[];     // Mobile money networks
  banks: NetworkWithHelpers[];      // Bank networks

  findMobile(name: string): NetworkWithHelpers;  // Search mobile networks
  findBank(name: string): NetworkWithHelpers;    // Search bank networks
}
```

### Network Object

```typescript
interface Network {
  id: string;                      // Network UUID (use as networkCode)
  code: string;                    // Network code identifier
  updatedAt: string;
  status: string;
  accountNumberType: "bank" | "phone";
  country: string;                 // ISO 2-letter code (e.g., "NG")
  name: string;                    // e.g., "MTN Mobile Money"
  channelIds: string[];            // Available channel UUIDs
  selectedChannelId: string;       // Recommended channel UUID
  countryAccountNumberType: string;
  minAmount: number;               // Min transaction amount
  maxAmount: number;               // Max transaction amount
}
```

## Helper Methods

### `findMobile(name)` / `findBank(name)`

Search for a network by name. Uses **case-insensitive partial matching**:

```typescript
const networks = await payd.networks.discover("receipt", "+234");

// All of these work:
networks.findMobile("MTN");
networks.findMobile("mtn");
networks.findMobile("MTN Mobile Money");

// Throws PaydValidationError if not found
try {
  networks.findMobile("NonExistent");
} catch (e) {
  // "No mobile network found matching "NonExistent". Available: MTN, OPay, ..."
}
```

### `toPaymentParams()`

Returns an object you can spread directly into a Pan-African collection or payout request:

```typescript
const mtn = networks.findMobile("MTN");
const params = mtn.toPaymentParams();

// Returns:
// {
//   networkCode: "abc-123-...",
//   channelId: "def-456-...",
//   transactionChannel: "phone",
//   providerName: "MTN Mobile Money",
//   providerCode: "100001",
// }

// Use in a collection:
await payd.collections.panAfrican({
  ...params,   // Spread all network params
  username: "my_user",
  accountName: "phone",
  amount: 1800,
  // ...
});
```

## Browsing Networks

```typescript
const networks = await payd.networks.discover("receipt", "+234");

// List all mobile networks with limits
for (const net of networks.mobile) {
  console.log(`${net.name}:`);
  console.log(`  Type: ${net.accountNumberType}`);
  console.log(`  Country: ${net.country}`);
  console.log(`  Min: ${net.minAmount}`);
  console.log(`  Max: ${net.maxAmount}`);
  console.log(`  Channels: ${net.channelIds.length}`);
}
```

## Common Dial Codes

| Country | Dial Code | Currency |
|---------|-----------|----------|
| Kenya | `+254` | KES |
| Nigeria | `+234` | NGN |
| Uganda | `+256` | UGX |
| Tanzania | `+255` | TZS |
| Ghana | `+233` | GHS |
| South Africa | `+27` | ZAR |
| Rwanda | `+250` | RWF |
| Zambia | `+260` | ZMW |
| Senegal | `+221` | XOF |
| Cameroon | `+237` | XAF |
