import type { BaseResponse, WalletType } from "./common";

export interface TransferParams {
  /** Payd username of the recipient */
  receiverUsername: string;
  /** Amount to transfer */
  amount: number;
  /** Description of the transfer */
  narration: string;
  /** Recipient's phone number with country code (e.g., +254700000000) */
  phoneNumber?: string;
  /** Currency code (optional — Payd auto-converts if different) */
  currency?: string;
  /** Wallet to fund the transfer from (default: "local") */
  walletType?: WalletType;
}

export interface TransferResponse extends BaseResponse {
  transactionReference: string;
  trackingId: string;
  reference: string;
  result: unknown;
  /** Raw API response */
  _raw: Record<string, unknown>;
}
