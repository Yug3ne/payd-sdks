export interface ProcessedAt {
  seconds: number;
  nanos: number;
}

export interface TransactionDetails {
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

export interface TransactionStatusResponse {
  id: string;
  accountId: string;
  billingCurrency: string;
  currency: string;
  /** Transaction reference code */
  code: string;
  conversionRate: number;
  amount: number;
  billingCurrencyAmount: number;
  balance: number;
  /** Transaction type: "receipt", "withdrawal", "transfer", "topup" */
  type: string;
  transactionDetails: TransactionDetails;
  transactionCategory: string;
  userId: string;
  requestMetadata: unknown;
  createdAt: string;
  /** Alias for `code` — consistent with other responses */
  transactionReference: string;
  /** Raw API response */
  _raw: Record<string, unknown>;
}
