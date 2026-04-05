import type { PaydClient } from "../client";
import type { TransactionStatusResponse, TransactionDetails } from "../types/transactions";
import { validateRequired } from "../validators/params";

/**
 * Transaction status lookup operations.
 */
export class Transactions {
  constructor(private readonly client: PaydClient) {}

  /**
   * Look up the full details and current status of any Payd transaction.
   *
   * @param transactionReference - The Payd transaction reference (e.g., "9BD103350408eR")
   *
   * @example
   * ```typescript
   * const tx = await payd.transactions.getStatus("9BD103350408eR");
   * console.log(tx.type);                          // "receipt"
   * console.log(tx.transactionDetails.status);      // "success"
   * console.log(tx.amount);                         // 10000
   * ```
   */
  async getStatus(transactionReference: string): Promise<TransactionStatusResponse> {
    validateRequired({ transactionReference }, ["transactionReference"]);

    const data = await this.client.request({
      method: "GET",
      path: `/api/v1/status/${encodeURIComponent(transactionReference)}`,
    });

    const rawDetails = data.transaction_details as Record<string, unknown> || {};
    const processedAt = rawDetails.processed_at as Record<string, number> || {};

    const transactionDetails: TransactionDetails = {
      payer: (rawDetails.payer as string) || "",
      merchantId: (rawDetails.merchant_id as string) || "",
      phoneNumber: (rawDetails.phone_number as string) || "",
      processedAt: {
        seconds: processedAt.seconds || 0,
        nanos: processedAt.nanos || 0,
      },
      reason: (rawDetails.reason as string) || "",
      channel: (rawDetails.channel as string) || "",
      accountNumber: (rawDetails.account_number as string) || "",
      status: (rawDetails.status as string) || "",
      receiver: (rawDetails.receiver as string) || "",
      emailAddress: (rawDetails.email_address as string) || "",
    };

    return {
      id: (data.id as string) || "",
      accountId: (data.account_id as string) || "",
      billingCurrency: (data.billing_currency as string) || "",
      currency: (data.currency as string) || "",
      code: (data.code as string) || "",
      conversionRate: (data.conversion_rate as number) || 0,
      amount: (data.amount as number) || 0,
      billingCurrencyAmount: (data.billing_currency_amount as number) || 0,
      balance: (data.balance as number) || 0,
      type: (data.type as string) || "",
      transactionDetails,
      transactionCategory: (data.transaction_category as string) || "",
      userId: (data.user_id as string) || "",
      requestMetadata: data.request_metadata ?? null,
      createdAt: (data.created_at as string) || "",
      transactionReference: (data.code as string) || "",
      _raw: data,
    };
  }
}
