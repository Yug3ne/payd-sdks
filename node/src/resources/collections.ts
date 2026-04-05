import type { PaydClient } from "../client";
import type {
  MpesaCollectionParams,
  MpesaCollectionResponse,
  CardCollectionParams,
  CardCollectionResponse,
  PanAfricanCollectionParams,
  PanAfricanCollectionResponse,
  BankAccount,
} from "../types/collections";
import { PaydAPIError } from "../errors";
import { validateKenyaPhone, normalizeKenyaPhone } from "../validators/phone";
import { validateInternationalPhone } from "../validators/phone";
import { validateMpesaAmount, validateCardAmount, validatePositiveAmount } from "../validators/amount";
import { validateRequired, validateEnum } from "../validators/params";

/**
 * Collection (payin) operations — collect payments from customers.
 */
export class Collections {
  constructor(private readonly client: PaydClient) {}

  /**
   * Collect a payment via Kenya M-Pesa STK Push.
   *
   * Initiates an STK push to the customer's phone. The customer confirms
   * payment on their device. Final status is delivered via webhook.
   *
   * @example
   * ```typescript
   * const result = await payd.collections.mpesa({
   *   username: "my_payd_user",
   *   amount: 500,
   *   phoneNumber: "0700000000",
   *   narration: "Order #1234",
   *   callbackUrl: "https://example.com/webhook",
   * });
   * console.log(result.transactionReference); // "9BD103350408eR"
   * ```
   */
  async mpesa(params: MpesaCollectionParams): Promise<MpesaCollectionResponse> {
    const username = params.username || this.client.defaults.username;
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;

    validateRequired({ username, callbackUrl, narration: params.narration }, [
      "username",
      "callbackUrl",
      "narration",
    ]);

    // Normalize +254 to 0-prefix
    const phoneNumber = normalizeKenyaPhone(params.phoneNumber);
    validateKenyaPhone(phoneNumber);
    validateMpesaAmount(params.amount);

    const data = await this.client.request({
      method: "POST",
      path: "/api/v2/payments",
      body: {
        username,
        channel: "MPESA",
        amount: params.amount,
        phone_number: phoneNumber,
        narration: params.narration,
        currency: "KES",
        callback_url: callbackUrl,
      },
    });

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      paymentMethod: data.payment_method as string,
      transactionReference: resolveTransactionRef(data),
      trackingId: (data.trackingId as string) || "",
      reference: (data.reference as string) || "",
      result: data.result ?? null,
      _raw: data,
    };
  }

  /**
   * Accept a card payment via hosted checkout.
   *
   * Returns a `checkoutUrl` that you redirect the customer to. The customer
   * enters card details on the hosted page. Final status is delivered via webhook.
   *
   * @example
   * ```typescript
   * const result = await payd.collections.card({
   *   username: "my_payd_user",
   *   amount: 500,
   *   phoneNumber: "0700000000",
   *   narration: "Order #1234",
   *   callbackUrl: "https://example.com/webhook",
   * });
   * // Redirect customer to:
   * console.log(result.checkoutUrl);
   * ```
   */
  async card(params: CardCollectionParams): Promise<CardCollectionResponse> {
    const username = params.username || this.client.defaults.username;
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;

    validateRequired({ username, callbackUrl, narration: params.narration }, [
      "username",
      "callbackUrl",
      "narration",
    ]);

    const phoneNumber = normalizeKenyaPhone(params.phoneNumber);
    validateKenyaPhone(phoneNumber);
    validateCardAmount(params.amount);

    const data = await this.client.request({
      method: "POST",
      path: "/api/v2/payments",
      body: {
        username,
        channel: "card",
        payment_method: "card",
        amount: params.amount,
        phone_number: phoneNumber,
        narration: params.narration,
        currency: "KES",
        callback_url: callbackUrl,
      },
    });

    // Normalize reference key
    const transactionReference = resolveTransactionRef(data);

    // Card responses must include a checkout URL
    const checkoutUrl = data.checkout_url as string;
    if (!checkoutUrl) {
      throw new PaydAPIError(
        200,
        (data.message as string) || "Card collection response missing checkout_url",
        data,
      );
    }

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      paymentMethod: data.payment_method as string,
      checkoutUrl,
      transactionReference,
      trackingId: (data.trackingId as string) || "",
      reference: (data.reference as string) || "",
      result: data.result ?? null,
      _raw: data,
    };
  }

  /**
   * Collect a payment via Pan-African mobile money or bank transfer.
   *
   * Requires calling `payd.networks.discover()` first to get the
   * `networkCode` and `channelId` for the target country.
   *
   * @example
   * ```typescript
   * // Step 1: Discover networks for Nigeria
   * const networks = await payd.networks.discover("receipt", "+234");
   * const network = networks.findMobile("OPay");
   *
   * // Step 2: Collect payment
   * const result = await payd.collections.panAfrican({
   *   username: "my_payd_user",
   *   ...network.toPaymentParams(),
   *   accountName: "phone",
   *   amount: 1800,
   *   phoneNumber: "+2340000000000",
   *   accountNumber: "+2340000000000",
   *   narration: "Order #1234",
   *   currency: "NGN",
   *   callbackUrl: "https://example.com/webhook",
   * });
   * ```
   */
  async panAfrican(params: PanAfricanCollectionParams): Promise<PanAfricanCollectionResponse> {
    const username = params.username || this.client.defaults.username;
    const callbackUrl = params.callbackUrl || this.client.defaults.callbackUrl;

    validateRequired(
      {
        username,
        callbackUrl,
        narration: params.narration,
        accountName: params.accountName,
        accountNumber: params.accountNumber,
        networkCode: params.networkCode,
        channelId: params.channelId,
        currency: params.currency,
        transactionChannel: params.transactionChannel,
      },
      [
        "username",
        "callbackUrl",
        "narration",
        "accountName",
        "accountNumber",
        "networkCode",
        "channelId",
        "currency",
        "transactionChannel",
      ],
    );

    validateInternationalPhone(params.phoneNumber);
    validatePositiveAmount(params.amount);
    validateEnum(params.accountName, ["bank", "phone"], "accountName");
    validateEnum(params.transactionChannel, ["bank", "phone"], "transactionChannel");

    const body: Record<string, unknown> = {
      username,
      account_name: params.accountName,
      amount: params.amount,
      phone_number: params.phoneNumber,
      account_number: params.accountNumber,
      network_code: params.networkCode,
      channel_id: params.channelId,
      narration: params.narration,
      currency: params.currency,
      callback_url: callbackUrl,
      transaction_channel: params.transactionChannel,
    };

    if (params.redirectUrl) {
      body.redirect_url = params.redirectUrl;
    }

    const data = await this.client.request({
      method: "POST",
      path: "/api/v3/payments",
      body,
    });

    // Parse optional bank_account from response
    let bankAccount: BankAccount | undefined;
    const rawBank = data.bank_account as Record<string, string> | undefined;
    if (rawBank) {
      bankAccount = {
        name: rawBank.name || "",
        branchCode: rawBank.branch_code || "",
        accountNumber: rawBank.account_number || "",
        accountName: rawBank.account_name || "",
        accountReference: rawBank.account_reference || "",
      };
    }

    return {
      success: data.success as boolean,
      message: data.message as string,
      status: data.status as string,
      paymentMethod: data.payment_method as string,
      transactionReference: resolveTransactionRef(data),
      bankAccount,
      checkoutUrl: data.checkout_url as string | undefined,
      trackingId: (data.trackingId as string) || "",
      reference: (data.reference as string) || "",
      result: data.result ?? null,
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
