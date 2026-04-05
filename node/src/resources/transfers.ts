import type { PaydClient } from "../client";
import type { TransferParams, TransferResponse } from "../types/transfers";
import { validateInternationalPhone } from "../validators/phone";
import { validatePositiveAmount } from "../validators/amount";
import { validateRequired } from "../validators/params";

/**
 * Payd-to-Payd transfer operations — send money between Payd accounts.
 */
export class Transfers {
  constructor(private readonly client: PaydClient) {}

  /**
   * Send money instantly between Payd accounts.
   *
   * Transfers are immediate — no webhook is needed (though one is sent if
   * a callback_url was originally set on the account).
   *
   * @example
   * ```typescript
   * const result = await payd.transfers.send({
   *   receiverUsername: "recipient_user",
   *   amount: 100,
   *   narration: "Lunch money",
   *   phoneNumber: "+254700000000",
   * });
   * console.log(result.transactionReference); // "9BD12041887.eS"
   * ```
   */
  async send(params: TransferParams): Promise<TransferResponse> {
    const walletType = params.walletType || this.client.defaults.walletType || "local";

    validateRequired(
      {
        receiverUsername: params.receiverUsername,
        narration: params.narration,
      },
      ["receiverUsername", "narration"],
    );

    validatePositiveAmount(params.amount);

    if (params.phoneNumber) {
      validateInternationalPhone(params.phoneNumber);
    }

    const body: Record<string, unknown> = {
      receiver_username: params.receiverUsername,
      amount: params.amount,
      narration: params.narration,
    };

    if (params.phoneNumber) {
      body.phone_number = params.phoneNumber;
    }
    if (params.currency) {
      body.currency = params.currency;
    }
    if (walletType !== "local") {
      body.wallet_type = walletType;
    }

    const data = await this.client.request({
      method: "POST",
      path: "/api/v2/remittance",
      body,
    });

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      transactionReference:
        (data.transaction_reference as string) ||
        (data.correlator_id as string) ||
        "",
      trackingId: (data.trackingId as string) || "",
      reference: (data.reference as string) || "",
      result: data.result ?? null,
      _raw: data,
    };
  }
}
