/**
 * @payd-money/node — Official Payd SDK for Node.js
 *
 * @example
 * ```typescript
 * import { PaydClient } from "@payd-money/node";
 *
 * const payd = new PaydClient({
 *   apiUsername: process.env.PAYD_API_USERNAME!,
 *   apiPassword: process.env.PAYD_API_PASSWORD!,
 * });
 *
 * // Collect via M-Pesa
 * const collection = await payd.collections.mpesa({
 *   username: "my_payd_user",
 *   amount: 500,
 *   phoneNumber: "0700000000",
 *   narration: "Order #1234",
 *   callbackUrl: "https://example.com/webhook",
 * });
 *
 * // Handle webhooks
 * const event = payd.webhooks.parseEvent(req.body);
 * if (event.isSuccess) {
 *   console.log(`Payment ${event.transactionReference} succeeded!`);
 * }
 * ```
 */

// Main client
export { PaydClient } from "./client";

// Errors
export {
  PaydError,
  PaydAuthenticationError,
  PaydValidationError,
  PaydAPIError,
  PaydNetworkError,
  PaydWebhookVerificationError,
} from "./errors";

// Resource classes (for type imports)
export { Collections } from "./resources/collections";
export { Payouts } from "./resources/payouts";
export { Transfers } from "./resources/transfers";
export { Networks } from "./resources/networks";
export { Transactions } from "./resources/transactions";
export { Balances } from "./resources/balances";
export { Webhooks } from "./webhooks";

// Types — Collections
export type {
  MpesaCollectionParams,
  MpesaCollectionResponse,
  CardCollectionParams,
  CardCollectionResponse,
  PanAfricanCollectionParams,
  PanAfricanCollectionResponse,
  BankAccount,
} from "./types/collections";

// Types — Payouts
export type {
  MpesaPayoutParams,
  MpesaPayoutResponse,
  PanAfricanPayoutParams,
  PanAfricanPayoutResponse,
  MerchantPayoutParams,
  MerchantPayoutResponse,
} from "./types/payouts";

// Types — Transfers
export type { TransferParams, TransferResponse } from "./types/transfers";

// Types — Networks
export type {
  Network,
  NetworkWithHelpers,
  NetworkDiscoveryResponse,
  NetworkPaymentParams,
} from "./types/networks";

// Types — Transactions
export type {
  TransactionStatusResponse,
  TransactionDetails,
  ProcessedAt,
} from "./types/transactions";

// Types — Balances
export type { BalancesResponse, WalletBalance } from "./types/balances";

// Types — Webhooks
export type { WebhookEvent } from "./types/webhooks";

// Types — Common
export type {
  PaydClientOptions,
  WalletType,
  AccountType,
  TransactionType,
  TransactionKind,
  BaseResponse,
  ErrorResponse,
} from "./types/common";

// Validators (for advanced use)
export { validateKenyaPhone, validateInternationalPhone, normalizeKenyaPhone } from "./validators/phone";
export { validateMpesaAmount, validateCardAmount, validatePositiveAmount } from "./validators/amount";
export { validateRequired, validateEnum } from "./validators/params";
