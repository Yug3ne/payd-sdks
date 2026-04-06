import {
  PaydClient,
  PaydValidationError,
  PaydAPIError,
  PaydAuthenticationError,
  PaydNetworkError,
  PaydWebhookVerificationError,
} from "payd-node-sdk";

const sessionClients = new Map();
const sessionConfigs = new Map();

/** Try to initialize from environment variables on startup */
export function initFromEnv() {
  // Environment fallback intentionally disabled: all credentials are session-scoped.
  return false;
}

/** Configure with new credentials at runtime */
export function configure(sessionId, options) {
  const config = { ...options, debug: process.env.NODE_ENV !== "production" };
  const client = new PaydClient(config);

  if (sessionId) {
    sessionConfigs.set(sessionId, config);
    sessionClients.set(sessionId, client);
    console.log(`[SDK] Session configured with user: ${options.apiUsername}`);
    return;
  }
}

/** Remove runtime configuration for a specific browser session */
export function disconnect(sessionId) {
  if (!sessionId) return false;
  const hadConfig = sessionConfigs.delete(sessionId);
  sessionClients.delete(sessionId);
  return hadConfig;
}

/** Get the current PaydClient instance */
export function getClient(sessionId) {
  if (sessionId && sessionClients.has(sessionId)) {
    return sessionClients.get(sessionId);
  }
  return null;
}

/** Get the current config (password omitted) */
export function getConfig(sessionId) {
  const config = sessionId && sessionConfigs.has(sessionId)
    ? sessionConfigs.get(sessionId)
    : null;

  if (!config) return null;
  return {
    apiUsername: config.apiUsername,
    defaultUsername: config.defaultUsername || "",
    defaultCallbackUrl: config.defaultCallbackUrl || "",
    walletType: config.walletType || "local",
    baseUrl: config.baseUrl || "https://api.payd.money",
    isConnected: true,
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
