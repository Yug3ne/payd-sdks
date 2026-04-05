import {
  PaydClient,
  PaydValidationError,
  PaydAPIError,
  PaydAuthenticationError,
  PaydNetworkError,
  PaydWebhookVerificationError,
} from "@payd-money/node";

let client = null;
let currentConfig = null;

/** Try to initialize from environment variables on startup */
export function initFromEnv() {
  const apiUsername = process.env.PAYD_API_USERNAME;
  const apiPassword = process.env.PAYD_API_PASSWORD;

  if (apiUsername && apiPassword) {
    const port = process.env.PORT || 3456;
    const callbackUrl =
      process.env.PAYD_CALLBACK_URL || `http://localhost:${port}/api/webhooks/receive`;

    currentConfig = {
      apiUsername,
      apiPassword,
      defaultUsername: process.env.PAYD_USERNAME || "",
      defaultCallbackUrl: callbackUrl,
      walletType: "local",
      debug: true,
    };

    client = new PaydClient(currentConfig);
    console.log(`[SDK] Initialized from env vars (user: ${apiUsername})`);
    return true;
  }
  return false;
}

/** Configure with new credentials at runtime */
export function configure(options) {
  currentConfig = { ...options, debug: true };
  client = new PaydClient(currentConfig);
  console.log(`[SDK] Configured with user: ${options.apiUsername}`);
}

/** Get the current PaydClient instance */
export function getClient() {
  return client;
}

/** Get the current config (password omitted) */
export function getConfig() {
  if (!currentConfig) return null;
  return {
    apiUsername: currentConfig.apiUsername,
    defaultUsername: currentConfig.defaultUsername || "",
    defaultCallbackUrl: currentConfig.defaultCallbackUrl || "",
    walletType: currentConfig.walletType || "local",
    baseUrl: currentConfig.baseUrl || "https://api.payd.money",
    isConnected: !!client,
  };
}

/**
 * Classify an SDK error into a structured response object.
 */
export function classifyError(error) {
  if (error instanceof PaydValidationError) {
    return {
      type: "PaydValidationError",
      message: error.message,
      field: error.field || null,
    };
  }
  if (error instanceof PaydAuthenticationError) {
    return {
      type: "PaydAuthenticationError",
      message: error.message,
    };
  }
  if (error instanceof PaydAPIError) {
    return {
      type: "PaydAPIError",
      message: error.message,
      statusCode: error.statusCode,
      detail: error.detail || null,
    };
  }
  if (error instanceof PaydWebhookVerificationError) {
    return {
      type: "PaydWebhookVerificationError",
      message: error.message,
    };
  }
  if (error instanceof PaydNetworkError) {
    return {
      type: "PaydNetworkError",
      message: error.message,
    };
  }
  return {
    type: "UnknownError",
    message: error.message || String(error),
  };
}
