# Types Reference

All types exported by the SDK. Import using `import type { ... } from "payd-node-sdk"`.

## Common Types

### PaydClientOptions

```typescript
interface PaydClientOptions {
  apiUsername: string;
  apiPassword: string;
  baseUrl?: string;
  timeout?: number;
  walletType?: WalletType;
  defaultCallbackUrl?: string;
  defaultUsername?: string;
  debug?: boolean;
  maxRetries?: number;
}
```

### WalletType

```typescript
type WalletType = "local" | "USD";
```

### AccountType

```typescript
type AccountType = "bank" | "phone";
```

### TransactionType

```typescript
type TransactionType = "receipt" | "withdrawal";
```

### TransactionKind

```typescript
type TransactionKind = "receipt" | "withdrawal" | "transfer" | "topup" | "unknown";
```

### BaseResponse

```typescript
interface BaseResponse {
  success: boolean;
  message?: string;
  status?: string | number;
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  status: number;
  success: false;
  message: string;
}
```

## Collection Types

### MpesaCollectionParams

```typescript
interface MpesaCollectionParams {
  username: string;
  amount: number;
  phoneNumber: string;
  narration: string;
  callbackUrl: string;
}
```

### MpesaCollectionResponse

```typescript
interface MpesaCollectionResponse extends BaseResponse {
  paymentMethod: string;
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```

### CardCollectionParams

```typescript
interface CardCollectionParams {
  username: string;
  amount: number;
  phoneNumber: string;
  narration: string;
  callbackUrl: string;
}
```

### CardCollectionResponse

```typescript
interface CardCollectionResponse extends BaseResponse {
  paymentMethod: string;
  checkoutUrl: string;
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```

### PanAfricanCollectionParams

```typescript
interface PanAfricanCollectionParams {
  username: string;
  accountName: AccountType;
  amount: number;
  phoneNumber: string;
  accountNumber: string;
  networkCode: string;
  channelId: string;
  narration: string;
  currency: string;
  callbackUrl: string;
  transactionChannel: AccountType;
  redirectUrl?: string;
}
```

### PanAfricanCollectionResponse

```typescript
interface PanAfricanCollectionResponse extends BaseResponse {
  paymentMethod: string;
  transactionReference: string;
  bankAccount?: BankAccount;
  checkoutUrl?: string;
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```

### BankAccount

```typescript
interface BankAccount {
  name: string;
  branchCode: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
}
```

## Payout Types

### MpesaPayoutParams

```typescript
interface MpesaPayoutParams {
  phoneNumber: string;
  amount: number;
  narration: string;
  callbackUrl: string;
  walletType?: WalletType;
}
```

### MpesaPayoutResponse

```typescript
interface MpesaPayoutResponse extends BaseResponse {
  transactionReference: string;
  channel: string;
  amount: number;
  _raw: Record<string, unknown>;
}
```

### PanAfricanPayoutParams

```typescript
interface PanAfricanPayoutParams {
  username: string;
  networkCode: string;
  accountName: AccountType;
  accountHolderName: string;
  accountNumber: string;
  amount: number;
  phoneNumber: string;
  channelId: string;
  narration: string;
  currency: string;
  callbackUrl: string;
  transactionChannel: AccountType;
  providerName: string;
  providerCode: string;
  walletType?: WalletType;
}
```

### PanAfricanPayoutResponse

```typescript
interface PanAfricanPayoutResponse extends BaseResponse {
  transactionReference: string;
  channel: string;
  amount: number;
  _raw: Record<string, unknown>;
}
```

### MerchantPayoutParams

```typescript
interface MerchantPayoutParams {
  username: string;
  amount: number;
  phoneNumber: string;
  narration: string;
  businessAccount: string;
  businessNumber: string;
  callbackUrl: string;
  walletType?: WalletType;
}
```

### MerchantPayoutResponse

```typescript
interface MerchantPayoutResponse extends BaseResponse {
  transactionReference: string;
  channel: string;
  amount: number;
  _raw: Record<string, unknown>;
}
```

## Transfer Types

### TransferParams

```typescript
interface TransferParams {
  receiverUsername: string;
  amount: number;
  narration: string;
  phoneNumber?: string;
  currency?: string;
  walletType?: WalletType;
}
```

### TransferResponse

```typescript
interface TransferResponse extends BaseResponse {
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  _raw: Record<string, unknown>;
}
```

## Network Types

### Network

```typescript
interface Network {
  id: string;
  code: string;
  updatedAt: string;
  status: string;
  accountNumberType: AccountType;
  country: string;
  name: string;
  channelIds: string[];
  selectedChannelId: string;
  countryAccountNumberType: string;
  minAmount: number;
  maxAmount: number;
}
```

### NetworkWithHelpers

```typescript
interface NetworkWithHelpers extends Network {
  toPaymentParams(): NetworkPaymentParams;
}
```

### NetworkPaymentParams

```typescript
interface NetworkPaymentParams {
  networkCode: string;
  channelId: string;
  transactionChannel: AccountType;
  providerName: string;
  providerCode: string;
}
```

### NetworkDiscoveryResponse

```typescript
interface NetworkDiscoveryResponse {
  defaults: Network[];
  mobile: NetworkWithHelpers[];
  banks: NetworkWithHelpers[];
  findMobile(name: string): NetworkWithHelpers;
  findBank(name: string): NetworkWithHelpers;
}
```

## Transaction Types

### TransactionStatusResponse

```typescript
interface TransactionStatusResponse {
  id: string;
  accountId: string;
  billingCurrency: string;
  currency: string;
  code: string;
  conversionRate: number;
  amount: number;
  billingCurrencyAmount: number;
  balance: number;
  type: string;
  transactionDetails: TransactionDetails;
  transactionCategory: string;
  userId: string;
  requestMetadata: unknown;
  createdAt: string;
  transactionReference: string;
  _raw: Record<string, unknown>;
}
```

### TransactionDetails

```typescript
interface TransactionDetails {
  payer: string;
  merchantId: string;
  phoneNumber: string;
  processedAt: ProcessedAt;
  reason: string;
  channel: string;
  accountNumber: string;
  status: string;
  receiver: string;
  emailAddress: string;
}
```

### ProcessedAt

```typescript
interface ProcessedAt {
  seconds: number;
  nanos: number;
}
```

## Balance Types

### BalancesResponse

```typescript
interface BalancesResponse {
  fiatBalance: WalletBalance;
  onchainBalance: WalletBalance;
  _raw: Record<string, unknown>;
}
```

### WalletBalance

```typescript
interface WalletBalance {
  balance: number;
  convertedBalance: number;
  currency: string;
}
```

## Webhook Types

### WebhookEvent

```typescript
interface WebhookEvent {
  transactionReference: string;
  resultCode: number;
  remarks: string;
  thirdPartyTransId?: string;
  amount?: number;
  transactionDate?: string;
  forwardUrl?: string;
  orderId?: string;
  userId?: string;
  customerName?: string;
  success: boolean;
  status?: string;
  phoneNumber?: string;
  web3TransactionReference?: string;
  isSuccess: boolean;
  transactionType: TransactionKind;
  _raw: Record<string, unknown>;
}
```
