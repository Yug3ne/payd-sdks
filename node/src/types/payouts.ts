import type { AccountType, BaseResponse, WalletType } from "./common";

// ─── Kenya M-Pesa Payout ────────────────────────────────────────────────────

export interface MpesaPayoutParams {
  /** Recipient Kenyan phone number starting with 0 (exactly 10 digits) */
  phoneNumber: string;
  /** Amount in KES (min 10, max 250,000) */
  amount: number;
  /** Reason for the withdrawal */
  narration: string;
  /** URL where Payd will send the transaction webhook */
  callbackUrl: string;
  /** Wallet to fund the payout from (default: "local") */
  walletType?: WalletType;
}

export interface MpesaPayoutResponse extends BaseResponse {
  transactionReference: string;
  channel: string;
  amount: number;
  /** Raw API response */
  _raw: Record<string, unknown>;
}

// ─── Pan-African Payout ─────────────────────────────────────────────────────

export interface PanAfricanPayoutParams {
  /** The Payd username of the requesting/sending account */
  username: string;
  /** Network id from Network Discovery API */
  networkCode: string;
  /** "bank" for bank networks, "phone" for mobile money */
  accountName: AccountType;
  /** Name of the recipient */
  accountHolderName: string;
  /** Mobile money account number (with +country code) or bank account number */
  accountNumber: string;
  /** Amount in the specified currency */
  amount: number;
  /** Phone number with country code starting with + */
  phoneNumber: string;
  /** selected_channel_id from Network Discovery API */
  channelId: string;
  /** Reason for the payout */
  narration: string;
  /** Currency code matching the country (e.g., NGN, ZAR) */
  currency: string;
  /** URL where Payd will send the transaction webhook */
  callbackUrl: string;
  /** "bank" or "phone" — must match network type */
  transactionChannel: AccountType;
  /** Provider name from Network Discovery API (e.g., "OPay") */
  providerName: string;
  /** Provider code from Network Discovery API (e.g., "100004") */
  providerCode: string;
  /** Wallet to fund the payout from (default: "local") */
  walletType?: WalletType;
}

export interface PanAfricanPayoutResponse extends BaseResponse {
  transactionReference: string;
  channel: string;
  amount: number;
  /** Raw API response */
  _raw: Record<string, unknown>;
}

// ─── Merchant Payout ────────────────────────────────────────────────────────

export interface MerchantPayoutParams {
  /** Your Payd account username */
  username: string;
  /** Amount in KES */
  amount: number;
  /** Sender's phone number with country code (e.g., +254700000000) */
  phoneNumber: string;
  /** Description of the payment */
  narration: string;
  /** Paybill or Till number */
  businessAccount: string;
  /** Account number under the Paybill (not needed for Till) */
  businessNumber: string;
  /** URL where Payd will send the transaction webhook */
  callbackUrl: string;
  /** Wallet to fund the payout from (default: "local") */
  walletType?: WalletType;
}

export interface MerchantPayoutResponse extends BaseResponse {
  transactionReference: string;
  channel: string;
  amount: number;
  /** Raw API response */
  _raw: Record<string, unknown>;
}
