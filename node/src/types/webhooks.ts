import type { TransactionKind } from "./common";

/**
 * Parsed webhook event from Payd.
 */
export interface WebhookEvent {
  transactionReference: string;
  resultCode: number;
  remarks: string;
  /** External provider transaction ID (e.g., M-Pesa receipt number) */
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

  /**
   * Whether the transaction succeeded.
   * Derived from `result_code === 0 && success === true`.
   */
  isSuccess: boolean;

  /**
   * Transaction type derived from the reference suffix:
   * - "eR" → "receipt"
   * - "eW" → "withdrawal"
   * - "eS" → "transfer"
   * - "eT" → "topup"
   */
  transactionType: TransactionKind;

  /** Raw webhook payload */
  _raw: Record<string, unknown>;
}
