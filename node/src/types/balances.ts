export interface WalletBalance {
  balance: number;
  convertedBalance: number;
  currency: string;
}

export interface BalancesResponse {
  fiatBalance: WalletBalance;
  onchainBalance: WalletBalance;
  /** Raw API response */
  _raw: Record<string, unknown>;
}
