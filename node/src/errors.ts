/**
 * Base error class for all Payd SDK errors.
 */
export class PaydError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaydError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when API authentication fails (HTTP 401).
 */
export class PaydAuthenticationError extends PaydError {
  constructor(message = "Invalid API credentials. Check your apiUsername and apiPassword.") {
    super(message);
    this.name = "PaydAuthenticationError";
  }
}

/**
 * Thrown for client-side validation failures before the HTTP request is made.
 * Examples: invalid phone format, amount out of range, missing required fields.
 */
export class PaydValidationError extends PaydError {
  /** The field that failed validation */
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "PaydValidationError";
    this.field = field;
  }
}

/**
 * Thrown when the Payd API returns an error response.
 * This includes both HTTP non-2xx responses AND HTTP 200 with `success: false`.
 */
export class PaydAPIError extends PaydError {
  /** HTTP status code from the response */
  public readonly statusCode: number;
  /** Raw response body from the API */
  public readonly detail: unknown;

  constructor(statusCode: number, message: string, detail?: unknown) {
    super(message);
    this.name = "PaydAPIError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

/**
 * Thrown for network-level failures (connection refused, DNS errors, timeouts).
 */
export class PaydNetworkError extends PaydError {
  /** The original error that caused the network failure */
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "PaydNetworkError";
    this.cause = cause;
  }
}

/**
 * Thrown when webhook signature verification fails.
 */
export class PaydWebhookVerificationError extends PaydError {
  constructor(message = "Webhook signature verification failed.") {
    super(message);
    this.name = "PaydWebhookVerificationError";
  }
}
