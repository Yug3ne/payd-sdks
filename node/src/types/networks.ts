import type { AccountType } from "./common";

/**
 * A payment network returned by the Network Discovery API.
 */
export interface Network {
  /** Network UUID — use as `networkCode` in payment requests */
  id: string;
  /** Network code identifier */
  code: string;
  updatedAt: string;
  status: string;
  /** "phone" for mobile money, "bank" for bank networks */
  accountNumberType: AccountType;
  /** ISO 2-letter country code (e.g., "UG", "NG") */
  country: string;
  /** Human-readable network name (e.g., "MTN Mobile Money") */
  name: string;
  /** Available channel UUIDs */
  channelIds: string[];
  /** Recommended channel UUID — use as `channelId` in payment requests */
  selectedChannelId: string;
  countryAccountNumberType: string;
  /** Minimum transaction amount in local currency */
  minAmount: number;
  /** Maximum transaction amount in local currency */
  maxAmount: number;
}

/**
 * Helper object returned by network.toPaymentParams().
 * Spread this into Pan-African collection/payout requests.
 */
export interface NetworkPaymentParams {
  networkCode: string;
  channelId: string;
  transactionChannel: AccountType;
  providerName: string;
  providerCode: string;
}

/**
 * Rich Network object with helper methods.
 */
export interface NetworkWithHelpers extends Network {
  /**
   * Returns params ready to spread into a Pan-African payment request.
   * Extracts networkCode, channelId, transactionChannel, providerName, providerCode.
   */
  toPaymentParams(): NetworkPaymentParams;
}

/**
 * Full response from the Network Discovery API with helper methods.
 */
export interface NetworkDiscoveryResponse {
  defaults: Network[];
  mobile: NetworkWithHelpers[];
  banks: NetworkWithHelpers[];

  /**
   * Find a mobile money network by name (case-insensitive partial match).
   * @throws PaydValidationError if no match found
   */
  findMobile(name: string): NetworkWithHelpers;

  /**
   * Find a bank network by name (case-insensitive partial match).
   * @throws PaydValidationError if no match found
   */
  findBank(name: string): NetworkWithHelpers;
}

/** Raw network shape from the API (snake_case) */
export interface RawNetwork {
  id: string;
  code: string;
  updated_at: string;
  status: string;
  account_number_type: string;
  country: string;
  name: string;
  channel_ids: string[];
  selected_channel_id: string;
  country_account_number_type: string;
  min_amount: number;
  max_amount: number;
}

/** Raw Network Discovery API response */
export interface RawNetworkDiscoveryResponse {
  defaults: RawNetwork[];
  mobile: RawNetwork[];
  banks: RawNetwork[];
}
