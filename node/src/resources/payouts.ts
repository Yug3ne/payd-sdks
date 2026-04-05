import type { PaydClient } from "../client";
import type {
  MpesaPayoutParams,
  MpesaPayoutResponse,
  PanAfricanPayoutParams,
  PanAfricanPayoutResponse,
  MerchantPayoutParams,
  MerchantPayoutResponse,
} from "../types/payouts";
import { validateKenyaPhone, normalizeKenyaPhone, validateInternationalPhone } from "../validators/phone";
import { validateMpesaAmount, validatePositiveAmount } from "../validators/amount";
import { validateRequired, validateEnum } from "../validators/params";

/**
 * Payout (disbursement) operations — send money to recipients.
 */
export class Payouts {
  constructor(private readonly client: PaydClient) {}

  /**
   * Send money to an M-Pesa user in Kenya.
   *
   * @example
   * ```typescript
   * const result = await payd.payouts.mpesa({
   *   phoneNumber: "0700000000",
   *   amount: 500,
   *   narration: "Salary payment",
   *   callbackUrl: "https://example.com/webhook",
   * });
   * console.log(result.transactionReference); // "9BD141203407eW"
   * ```
   */
  async mpesa(params: MpesaPayoutParams): Promise<MpesaPayoutResponse> {
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;
    const walletType = params.walletType || this.client.defaults.walletType || "local";

    validateRequired({ callbackUrl, narration: params.narration }, [
      "callbackUrl",
      "narration",
    ]);

    const phoneNumber = normalizeKenyaPhone(params.phoneNumber);
    validateKenyaPhone(phoneNumber);
    validateMpesaAmount(params.amount);

    const body: Record<string, unknown> = {
      phone_number: phoneNumber,
      amount: params.amount,
      narration: params.narration,
      callback_url: callbackUrl,
      channel: "MPESA",
      currency: "KES",
    };

    if (walletType !== "local") {
      body.wallet_type = walletType;
    }

    const data = await this.client.request({
      method: "POST",
      path: "/api/v2/withdrawal",
      body,
    });

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      transactionReference: resolveTransactionRef(data),
      channel: (data.channel as string) || "",
      amount: (data.amount as number) || 0,
      _raw: data,
    };
  }

  /**
   * Send money to a mobile wallet or bank account across Africa.
   *
   * Requires calling `payd.networks.discover("withdrawal", dialCode)` first
   * to get the networkCode, channelId, providerName, and providerCode.
   *
   * @example
   * ```typescript
   * const networks = await payd.networks.discover("withdrawal", "+234");
   * const opay = networks.findBank("OPay");
   *
   * const result = await payd.payouts.panAfrican({
   *   username: "my_payd_user",
   *   ...opay.toPaymentParams(),
   *   accountName: "bank",
   *   accountHolderName: "John Doe",
   *   accountNumber: "0000000000",
   *   amount: 1800,
   *   phoneNumber: "+2340000000000",
   *   narration: "Payment for services",
   *   currency: "NGN",
   *   callbackUrl: "https://example.com/webhook",
   * });
   * ```
   */
  async panAfrican(params: PanAfricanPayoutParams): Promise<PanAfricanPayoutResponse> {
    const username = params.username || this.client.defaults.username;
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;
    const walletType = params.walletType || this.client.defaults.walletType || "local";

    validateRequired(
      {
        username,
        callbackUrl,
        narration: params.narration,
        accountName: params.accountName,
        accountHolderName: params.accountHolderName,
        accountNumber: params.accountNumber,
        networkCode: params.networkCode,
        channelId: params.channelId,
        currency: params.currency,
        transactionChannel: params.transactionChannel,
        providerName: params.providerName,
        providerCode: params.providerCode,
      },
      [
        "username",
        "callbackUrl",
        "narration",
        "accountName",
        "accountHolderName",
        "accountNumber",
        "networkCode",
        "channelId",
        "currency",
        "transactionChannel",
        "providerName",
        "providerCode",
      ],
    );

    validateInternationalPhone(params.phoneNumber);
    validatePositiveAmount(params.amount);
    validateEnum(params.accountName, ["bank", "phone"], "accountName");
    validateEnum(params.transactionChannel, ["bank", "phone"], "transactionChannel");

    const body: Record<string, unknown> = {
      username,
      network_code: params.networkCode,
      account_name: params.accountName,
      account_holder_name: params.accountHolderName,
      account_number: params.accountNumber,
      amount: params.amount,
      phone_number: params.phoneNumber,
      channel_id: params.channelId,
      narration: params.narration,
      currency: params.currency,
      callback_url: callbackUrl,
      transaction_channel: params.transactionChannel,
      channel: params.transactionChannel,
      provider_name: params.providerName,
      provider_code: params.providerCode,
    };

    if (walletType !== "local") {
      body.wallet_type = walletType;
    }

    const data = await this.client.request({
      method: "POST",
      path: "/api/v2/payments",
      body,
    });

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      transactionReference: resolveTransactionRef(data),
      channel: (data.channel as string) || "",
      amount: (data.amount as number) || 0,
      _raw: data,
    };
  }

  /**
   * Pay to an M-Pesa Paybill or Till number in Kenya.
   *
   * @example
   * ```typescript
   * // Pay a Paybill
   * const result = await payd.payouts.merchant({
   *   username: "my_payd_user",
   *   amount: 500,
   *   phoneNumber: "+254700000000",
   *   narration: "Utility bill payment",
   *   businessAccount: "123456",      // Paybill number
   *   businessNumber: "9876543210",   // Account number
   *   callbackUrl: "https://example.com/webhook",
   * });
   *
   * // Pay a Till
   * const result = await payd.payouts.merchant({
   *   username: "my_payd_user",
   *   amount: 200,
   *   phoneNumber: "+254700000000",
   *   narration: "Store purchase",
   *   businessAccount: "654321",   // Till number
   *   businessNumber: "N/A",       // Not needed for Till
   *   callbackUrl: "https://example.com/webhook",
   * });
   * ```
   */
  async merchant(params: MerchantPayoutParams): Promise<MerchantPayoutResponse> {
    const username = params.username || this.client.defaults.username;
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;
    const walletType = params.walletType || this.client.defaults.walletType || "local";

    validateRequired(
      {
        username,
        callbackUrl,
        narration: params.narration,
        businessAccount: params.businessAccount,
        businessNumber: params.businessNumber,
      },
      ["username", "callbackUrl", "narration", "businessAccount", "businessNumber"],
    );

    validateInternationalPhone(params.phoneNumber);
    validatePositiveAmount(params.amount);

    const body: Record<string, unknown> = {
      username,
      amount: params.amount,
      currency: "KES",
      phone_number: params.phoneNumber,
      narration: params.narration,
      transaction_channel: "bank",
      channel: "bank",
      business_account: params.businessAccount,
      business_number: params.businessNumber,
      callback_url: callbackUrl,
    };

    if (walletType !== "local") {
      body.wallet_type = walletType;
    }

    const data = await this.client.request({
      method: "POST",
      path: "/api/v3/withdrawal",
      body,
    });

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      transactionReference: resolveTransactionRef(data),
      channel: (data.channel as string) || "",
      amount: (data.amount as number) || 0,
      _raw: data,
    };
  }
}

/**
 * Resolve the transaction reference from whichever key the API returns.
 */
function resolveTransactionRef(data: Record<string, unknown>): string {
  return (
    (data.transaction_reference as string) ||
    (data.correlator_id as string) ||
    (data.payd_transaction_ref as string) ||
    ""
  );
}
