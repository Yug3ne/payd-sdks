import type { PaydClient } from "../client";
import type { BalancesResponse, WalletBalance } from "../types/balances";
import { validateRequired } from "../validators/params";

/**
 * Account balance operations.
 */
export class Balances {
  constructor(private readonly client: PaydClient) {}

  /**
   * Fetch all account balances including fiat (KES) and USD wallet.
   *
   * @param username - Payd account username (falls back to client default)
   *
   * @example
   * ```typescript
   * const balances = await payd.balances.getAll("my_payd_user");
   * console.log(balances.fiatBalance.balance);    // 1000.00
   * console.log(balances.fiatBalance.currency);   // "KES"
   * console.log(balances.onchainBalance.balance); // 500
   * console.log(balances.onchainBalance.currency);// "USD"
   * ```
   */
  async getAll(username?: string): Promise<BalancesResponse> {
    const resolvedUsername = username || this.client.defaults.username;
    validateRequired({ username: resolvedUsername }, ["username"]);

    const data = await this.client.request({
      method: "GET",
      path: `/api/v1/accounts/${encodeURIComponent(resolvedUsername!)}/all_balances`,
    });

    const rawFiat = data.fiat_balance as Record<string, unknown> || {};
    const rawOnchain = data.onchain_balance as Record<string, unknown> || {};

    const fiatBalance: WalletBalance = {
      balance: (rawFiat.balance as number) || 0,
      convertedBalance: (rawFiat.converted_balance as number) || 0,
      currency: (rawFiat.currency as string) || "",
    };

    const onchainBalance: WalletBalance = {
      balance: (rawOnchain.balance as number) || 0,
      convertedBalance: (rawOnchain.converted_balance as number) || 0,
      currency: (rawOnchain.currency as string) || "",
    };

    return {
      fiatBalance,
      onchainBalance,
      _raw: data,
    };
  }
}
