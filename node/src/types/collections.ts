import type { AccountType, BaseResponse } from "./common";

// ─── Kenya M-Pesa Collection ────────────────────────────────────────────────

export interface MpesaCollectionParams {
  /** Your Payd account username */
  username: string;
  /** Amount in KES (min 10, max 250,000) */
  amount: number;
  /** Kenyan phone number starting with 0 (exactly 10 digits) */
  phoneNumber: string;
  /** Reason for the collection, shown to customer */
  narration: string;
  /** URL where Payd will send the transaction webhook */
  callbackUrl: string;
}

export interface MpesaCollectionResponse extends BaseResponse {
  paymentMethod: string;
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  /** Raw API response */
  _raw: Record<string, unknown>;
}

// ─── Card Collection ────────────────────────────────────────────────────────

export interface CardCollectionParams {
  /** Your Payd account username */
  username: string;
  /** Amount in KES (min 100) */
  amount: number;
  /** Customer phone number (10 digits, starting with 0) */
  phoneNumber: string;
  /** Reason for the payment */
  narration: string;
  /** URL where Payd will send the transaction webhook */
  callbackUrl: string;
}

export interface CardCollectionResponse extends BaseResponse {
  paymentMethod: string;
  /** Hosted checkout URL — redirect customer here to complete payment */
  checkoutUrl: string;
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  /** Raw API response */
  _raw: Record<string, unknown>;
}

// ─── Pan-African Collection ─────────────────────────────────────────────────

export interface PanAfricanCollectionParams {
  /** The Payd username of the requesting/collecting account */
  username: string;
  /** "bank" for bank networks, "phone" for mobile money */
  accountName: AccountType;
  /** Transaction amount in the specified currency */
  amount: number;
  /** Phone number of the payer, with country code starting with + */
  phoneNumber: string;
  /** Mobile money account number (with +country code) or bank account number */
  accountNumber: string;
  /** Network id from Network Discovery API */
  networkCode: string;
  /** selected_channel_id from Network Discovery API */
  channelId: string;
  /** Reason for the collection */
  narration: string;
  /** Currency code matching the country (e.g., NGN, ZAR, GHS) */
  currency: string;
  /** URL where Payd will send the transaction webhook */
  callbackUrl: string;
  /** "bank" or "phone" — must match network type */
  transactionChannel: AccountType;
  /** Redirect URL for hosted checkout flows (e.g., South Africa) */
  redirectUrl?: string;
}

export interface BankAccount {
  name: string;
  branchCode: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
}

export interface PanAfricanCollectionResponse extends BaseResponse {
  paymentMethod: string;
  transactionReference: string;
  /** Present for bank transfer responses */
  bankAccount?: BankAccount;
  /** Present for hosted checkout responses (e.g., South Africa) */
  checkoutUrl?: string;
  trackingId: string;
  reference: string;
  result: unknown;
  /** Raw API response */
  _raw: Record<string, unknown>;
}
