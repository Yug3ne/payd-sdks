import type { WebhookEvent } from "./types/webhooks";
import type { TransactionKind } from "./types/common";
import { PaydValidationError } from "./errors";

/**
 * Webhook parsing and verification utilities.
 *
 * @example
 * ```typescript
 * // In an Express handler:
 * app.post("/webhook", (req, res) => {
 *   const event = payd.webhooks.parseEvent(req.body);
 *
 *   if (event.isSuccess) {
 *     console.log(`Payment ${event.transactionReference} succeeded!`);
 *   } else {
 *     console.log(`Payment ${event.transactionReference} failed: ${event.remarks}`);
 *   }
 *
 *   res.status(200).send("OK");
 * });
 * ```
 */
export class Webhooks {
  /**
   * Parse a webhook payload into a typed WebhookEvent.
   *
   * Accepts either a JSON string or an already-parsed object.
   * Adds convenience properties: `isSuccess` and `transactionType`.
   *
   * @param body - Raw webhook body (string or object)
   * @returns Typed WebhookEvent with derived fields
   */
  parseEvent(body: string | Record<string, unknown>): WebhookEvent {
    let data: Record<string, unknown>;

    if (typeof body === "string") {
      try {
        data = JSON.parse(body) as Record<string, unknown>;
      } catch {
        throw new PaydValidationError("Invalid JSON in webhook body");
      }
    } else if (body && typeof body === "object") {
      data = body;
    } else {
      throw new PaydValidationError("Webhook body must be a JSON string or object");
    }

    const transactionReference = (data.transaction_reference as string) || "";
    const resultCode = (data.result_code as number) ?? -1;
    const success = data.success as boolean;

    return {
      transactionReference,
      resultCode,
      remarks: (data.remarks as string) || "",
      thirdPartyTransId: data.third_party_trans_id as string | undefined,
      amount: data.amount as number | undefined,
      transactionDate: data.transaction_date as string | undefined,
      forwardUrl: data.forward_url as string | undefined,
      orderId: data.order_id as string | undefined,
      userId: data.user_id as string | undefined,
      customerName: data.customer_name as string | undefined,
      success,
      status: data.status as string | undefined,
      phoneNumber: data.phone_number as string | undefined,
      web3TransactionReference: data.web3_transaction_reference as string | undefined,

      // Derived fields
      isSuccess: resultCode === 0 && success === true,
      transactionType: deriveTransactionType(transactionReference),

      _raw: data,
    };
  }

}

/**
 * Derive transaction type from the reference suffix.
 *
 * Payd transaction references end with:
 * - "eR" → receipt (collection/payin)
 * - "eW" → withdrawal (payout)
 * - "eS" → transfer (Payd-to-Payd)
 * - "eT" → topup
 */
function deriveTransactionType(reference: string): TransactionKind {
  if (!reference) return "unknown";

  if (reference.endsWith("eR")) return "receipt";
  if (reference.endsWith("eW")) return "withdrawal";
  if (reference.endsWith("eS")) return "transfer";
  if (reference.endsWith("eT")) return "topup";

  // Handle the ".eS" format seen in transfer responses
  if (reference.includes(".eS")) return "transfer";

  return "unknown";
}
