import type { PaydClientOptions } from "./types/common";
import { PaydAuthenticationError, PaydAPIError, PaydNetworkError } from "./errors";
import { Collections } from "./resources/collections";
import { Payouts } from "./resources/payouts";
import { Transfers } from "./resources/transfers";
import { Networks } from "./resources/networks";
import { Transactions } from "./resources/transactions";
import { Balances } from "./resources/balances";
import { Webhooks } from "./webhooks";

const DEFAULT_BASE_URL = "https://api.payd.money";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;

/** HTTP methods the SDK uses */
type HttpMethod = "GET" | "POST";

/** Internal request options */
export interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

/**
 * The main Payd SDK client.
 *
 * @example
 * ```typescript
 * import { PaydClient } from "payd-node-sdk";
 *
 * const payd = new PaydClient({
 *   apiUsername: "your_api_username",
 *   apiPassword: "your_api_password",
 * });
 *
 * // Collect via M-Pesa
 * const result = await payd.collections.mpesa({
 *   username: "your_payd_username",
 *   amount: 100,
 *   phoneNumber: "0700000000",
 *   narration: "Payment for goods",
 *   callbackUrl: "https://your-server.com/callback",
 * });
 *
 * console.log(result.transactionReference);
 * ```
 */
export class PaydClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeout: number;
  private readonly debug: boolean;
  private readonly maxRetries: number;

  /** Default options that resource methods can use */
  public readonly defaults: {
    walletType?: string;
    callbackUrl?: string;
    username?: string;
  };

  /** Collection (payin) operations */
  public readonly collections: Collections;
  /** Payout operations */
  public readonly payouts: Payouts;
  /** Payd-to-Payd transfer operations */
  public readonly transfers: Transfers;
  /** Network Discovery */
  public readonly networks: Networks;
  /** Transaction status lookups */
  public readonly transactions: Transactions;
  /** Account balance queries */
  public readonly balances: Balances;
  /** Webhook parsing and verification utilities */
  public readonly webhooks: Webhooks;

  constructor(options: PaydClientOptions) {
    if (!options.apiUsername || !options.apiPassword) {
      throw new PaydAuthenticationError(
        "apiUsername and apiPassword are required to create a PaydClient.",
      );
    }

    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.debug = options.debug ?? false;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    // Build Basic Auth header
    const credentials = `${options.apiUsername}:${options.apiPassword}`;
    const encoded = typeof btoa === "function"
      ? btoa(credentials)
      : Buffer.from(credentials).toString("base64");
    this.authHeader = `Basic ${encoded}`;

    this.defaults = {
      walletType: options.walletType,
      callbackUrl: options.defaultCallbackUrl,
      username: options.defaultUsername,
    };

    // Initialize resource namespaces
    this.collections = new Collections(this);
    this.payouts = new Payouts(this);
    this.transfers = new Transfers(this);
    this.networks = new Networks(this);
    this.transactions = new Transactions(this);
    this.balances = new Balances(this);
    this.webhooks = new Webhooks();
  }

  /**
   * Internal: execute an HTTP request to the Payd API.
   * Handles auth, serialization, error mapping, and retries.
   */
  async request<T = Record<string, unknown>>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (options.body && options.method === "POST") {
      fetchOptions.body = JSON.stringify(options.body);
    }

    if (this.debug) {
      console.log(`[Payd SDK] ${options.method} ${url}`);
      if (options.body) {
        console.log(`[Payd SDK] Body:`, JSON.stringify(options.body, null, 2));
      }
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        if (this.debug) {
          console.log(`[Payd SDK] Response: ${response.status} ${response.statusText}`);
        }

        // Handle authentication errors
        if (response.status === 401) {
          throw new PaydAuthenticationError();
        }

        // Parse response body
        let data: Record<string, unknown>;
        try {
          data = (await response.json()) as Record<string, unknown>;
        } catch {
          throw new PaydAPIError(
            response.status,
            `Failed to parse API response (HTTP ${response.status})`,
          );
        }

        if (this.debug) {
          console.log(`[Payd SDK] Data:`, JSON.stringify(data, null, 2));
        }

        // Check for API errors: non-2xx OR success: false
        const isHttpOk = response.status >= 200 && response.status < 300;
        const successField = data.success;

        if (!isHttpOk || successField === false) {
          const message = (data.message as string) || `API request failed (HTTP ${response.status})`;
          const statusCode = typeof data.status === "number" ? data.status : response.status;
          throw new PaydAPIError(statusCode, message, data);
        }

        return data as T;
      } catch (error) {
        // Don't retry client errors (4xx) or known SDK errors
        if (
          error instanceof PaydAuthenticationError ||
          error instanceof PaydAPIError ||
          (error instanceof PaydAPIError && error.statusCode < 500)
        ) {
          throw error;
        }

        // Retry on network/5xx errors
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          // Exponential backoff: 200ms, 400ms, 800ms...
          const delay = 200 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries exhausted
    if (lastError instanceof PaydError) {
      throw lastError;
    }
    throw new PaydNetworkError(
      `Request to ${options.path} failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
      lastError,
    );
  }

  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }
}

// Re-export for the retry check
import { PaydError } from "./errors";
