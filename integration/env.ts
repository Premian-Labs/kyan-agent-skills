/**
 * Integration test environment configuration.
 *
 * All integration tests are gated behind environment variables.
 * They are automatically skipped when credentials are not available.
 *
 * Required env vars:
 *   KYAN_API_KEY           — API key from Premia team
 *   WALLET_PRIVATE_KEY     — Arbitrum Sepolia testnet wallet (no 0x prefix)
 *   CLEARING_HOUSE_PROXY   — ClearingHouseProxy contract address
 *
 * Optional:
 *   KYAN_BASE_URL          — Override REST base URL (default: staging)
 */

export const env = {
  apiKey: process.env.KYAN_API_KEY,
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
  clearingHouseProxy:
    process.env.CLEARING_HOUSE_PROXY ??
    "0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0", // Arbitrum Sepolia default
  baseUrl: process.env.KYAN_BASE_URL ?? "https://staging.kyan.sh",
  wsUrl: process.env.KYAN_WS_URL ?? "wss://staging.kyan.sh/ws",
};

/** True when at least an API key is available (read-only tests). */
export const hasApiKey = Boolean(env.apiKey);

/** True when full signing credentials are available (trading tests). */
export const hasSigningCredentials = Boolean(
  env.apiKey && env.walletPrivateKey,
);
