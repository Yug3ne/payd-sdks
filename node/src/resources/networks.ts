import type { PaydClient } from "../client";
import type {
  Network,
  NetworkWithHelpers,
  NetworkDiscoveryResponse,
  NetworkPaymentParams,
  RawNetwork,
  RawNetworkDiscoveryResponse,
} from "../types/networks";
import type { AccountType, TransactionType } from "../types/common";
import { PaydValidationError } from "../errors";
import { validateRequired, validateEnum } from "../validators/params";

/**
 * Network Discovery operations — discover available payment networks per country.
 */
export class Networks {
  constructor(private readonly client: PaydClient) {}

  /**
   * Discover available payment networks for a specific country.
   *
   * Call this before making Pan-African collections or payouts to get the
   * required `networkCode` and `channelId`.
   *
   * @param transactionType - "receipt" for collections, "withdrawal" for payouts
   * @param dialCode - Country dial code with + prefix (e.g., "+234" for Nigeria)
   *
   * @example
   * ```typescript
   * // Discover collection networks for Nigeria
   * const networks = await payd.networks.discover("receipt", "+234");
   *
   * // Find a specific mobile money network
   * const mtn = networks.findMobile("MTN");
   *
   * // Use its params in a payment request
   * await payd.collections.panAfrican({
   *   ...mtn.toPaymentParams(),
   *   username: "my_user",
   *   amount: 1800,
   *   phoneNumber: "+2340000000000",
   *   accountNumber: "+2340000000000",
   *   accountName: "phone",
   *   narration: "Order payment",
   *   currency: "NGN",
   *   callbackUrl: "https://example.com/webhook",
   * });
   * ```
   */
  async discover(
    transactionType: TransactionType,
    dialCode: string,
  ): Promise<NetworkDiscoveryResponse> {
    validateRequired({ transactionType, dialCode }, ["transactionType", "dialCode"]);
    validateEnum(transactionType, ["receipt", "withdrawal"], "transactionType");

    if (!dialCode.startsWith("+")) {
      throw new PaydValidationError(
        `dialCode must start with + (e.g., "+234"). Got: "${dialCode}"`,
        "dialCode",
      );
    }

    const data = (await this.client.request({
      method: "GET",
      path: "/v2/networks/grouped",
      query: {
        transaction_type: transactionType,
        dial_code: dialCode,
      },
    })) as unknown as RawNetworkDiscoveryResponse;

    return buildNetworkDiscoveryResponse(data);
  }
}

/**
 * Transform raw API response into a rich NetworkDiscoveryResponse with helpers.
 */
function buildNetworkDiscoveryResponse(
  raw: RawNetworkDiscoveryResponse,
): NetworkDiscoveryResponse {
  const defaults = (raw.defaults || []).map(transformNetwork);
  const mobile = (raw.mobile || []).map(enrichNetwork);
  const banks = (raw.banks || []).map(enrichNetwork);

  return {
    defaults,
    mobile,
    banks,

    findMobile(name: string): NetworkWithHelpers {
      const lower = name.toLowerCase();
      const found = mobile.find((n) => n.name.toLowerCase().includes(lower));
      if (!found) {
        const available = mobile.map((n) => n.name).join(", ");
        throw new PaydValidationError(
          `No mobile network found matching "${name}". Available: ${available || "none"}`,
        );
      }
      return found;
    },

    findBank(name: string): NetworkWithHelpers {
      const lower = name.toLowerCase();
      const found = banks.find((n) => n.name.toLowerCase().includes(lower));
      if (!found) {
        const available = banks.map((n) => n.name).join(", ");
        throw new PaydValidationError(
          `No bank network found matching "${name}". Available: ${available || "none"}`,
        );
      }
      return found;
    },
  };
}

/** Transform a raw snake_case network into a camelCase Network. */
function transformNetwork(raw: RawNetwork): Network {
  return {
    id: raw.id,
    code: raw.code,
    updatedAt: raw.updated_at,
    status: raw.status,
    accountNumberType: raw.account_number_type as AccountType,
    country: raw.country,
    name: raw.name,
    channelIds: raw.channel_ids || [],
    selectedChannelId: raw.selected_channel_id,
    countryAccountNumberType: raw.country_account_number_type,
    minAmount: raw.min_amount,
    maxAmount: raw.max_amount,
  };
}

/** Transform and enrich a network with helper methods. */
function enrichNetwork(raw: RawNetwork): NetworkWithHelpers {
  const network = transformNetwork(raw);

  return {
    ...network,
    toPaymentParams(): NetworkPaymentParams {
      return {
        networkCode: network.id,
        channelId: network.selectedChannelId,
        transactionChannel: network.accountNumberType,
        providerName: network.name,
        providerCode: network.code,
      };
    },
  };
}
