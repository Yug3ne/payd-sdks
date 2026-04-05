/**
 * Wallet type for funding payouts and transfers.
 * - "local": uses the local currency wallet (default)
 * - "USD": uses the USD wallet; amount is still specified in local currency
 */
export type WalletType = "local" | "USD";

/**
 * Account/network type for Pan-African operations.
 */
export type AccountType = "bank" | "phone";

/**
 * Transaction type for Network Discovery.
 */
export type TransactionType = "receipt" | "withdrawal";

/**
 * Derived transaction type from a transaction reference suffix.
 */
export type TransactionKind = "receipt" | "withdrawal" | "transfer" | "topup" | "unknown";

/**
 * Base API response shape — all Payd responses include these fields.
 */
export interface BaseResponse {
  success: boolean;
  message?: string;
  status?: string | number;
}

/**
 * Error response shape from the Payd API.
 */
export interface ErrorResponse {
  status: number;
  success: false;
  message: string;
}

/**
 * Options for constructing a PaydClient.
 */
export interface PaydClientOptions {
  /** Payd API username */
  apiUsername: string;
  /** Payd API password */
  apiPassword: string;
  /** Base URL for the Payd API (default: https://api.payd.money) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Default wallet type for payouts/transfers (default: "local") */
  walletType?: WalletType;
  /** Default callback URL for webhooks */
  defaultCallbackUrl?: string;
  /** Default Payd username (used in requests that require it) */
  defaultUsername?: string;
  /** Enable debug logging of requests/responses */
  debug?: boolean;
  /** Number of retries for transient errors (default: 2) */
  maxRetries?: number;
}
