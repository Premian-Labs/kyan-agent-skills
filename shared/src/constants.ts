import type { TradingPair, FeeSchedule } from "./types.js";

// ── Chain Configuration ────────────────────────────────────────────────
export const CHAIN_IDS = {
  ARBITRUM_SEPOLIA: 421614,
  ARBITRUM_ONE: 42161,
} as const;

// ── Endpoints ──────────────────────────────────────────────────────────
export const ENDPOINTS = {
  REST_STAGING: "https://staging.kyan.sh",
  REST_PRODUCTION: "https://api.kyan.blue",
  WS_STAGING: "wss://staging.kyan.sh/ws",
  WS_PRODUCTION: "wss://api.kyan.blue/ws",
  MCP_SERVER: "https://docs.kyan.blue/mcp",
} as const;

// ── Contracts ──────────────────────────────────────────────────────────
export const CONTRACTS = {
  MOCK_USDC_SEPOLIA: "0x07a7D6b723d0aa62cD78da00452Ba3cD3b72C3d7",
  KYAN_USDC_SEPOLIA: "0xA4387E780091cA2C479F71Bf5AC0cF729098c0C3",
  CLEARING_HOUSE_PROXY_SEPOLIA: "0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0",
  CLEARING_HOUSE_IMPL_SEPOLIA: "0x9851F23AB63b9a095b59840E1e6D6415D32F9f01",
} as const;

// ── EIP-712 Domain ─────────────────────────────────────────────────────
export const EIP712_DOMAIN_NAME = "Premia" as const;
export const EIP712_DOMAIN_VERSION = "1" as const;

// ── Precision ──────────────────────────────────────────────────────────
export const USDC_DECIMALS = 6;

// ── Rate Limits ────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  MARKET_DATA: { requests: 20, perSeconds: 1 },
  TRADING: { requests: 5, perSeconds: 1 },
  ACCOUNT: { requests: 2, perSeconds: 1 },
  RFQ: { requests: 6, perSeconds: 60 },
} as const;

// ── WebSocket Reconnection ─────────────────────────────────────────────
export const WS_RECONNECT = {
  MAX_ATTEMPTS: 5,
  INITIAL_INTERVAL_MS: 1000,
  MAX_INTERVAL_MS: 30000,
} as const;

// ── Session Recovery ───────────────────────────────────────────────────
export const SESSION_RECOVERY = {
  DEFAULT_TTL_SECONDS: 30,
  MAX_BUFFERED_MESSAGES: 1000,
} as const;

// ── Deadline Constraints ───────────────────────────────────────────────
export const DEADLINES = {
  ORDER_SECONDS: 30,
  ONE_CLICK_SESSION_SECONDS: 3600,
} as const;

// ── Fee Schedules (in basis points) ────────────────────────────────────
export const PERP_FEES: Record<TradingPair, FeeSchedule> = {
  BTC_USDC: { maker: 0, taker: 0.0008, liquidation: 0.0015 },
  ETH_USDC: { maker: 0, taker: 0.0008, liquidation: 0.0015 },
  ARB_USDC: { maker: 0, taker: 0.0008, liquidation: 0.0025 },
};

export const OPTIONS_FEES: Record<TradingPair, FeeSchedule> = {
  BTC_USDC: { maker: 0.0004, taker: 0.0004, liquidation: 0.0019 },
  ETH_USDC: { maker: 0.0004, taker: 0.0004, liquidation: 0.0019 },
  ARB_USDC: { maker: 0.0008, taker: 0.0008, liquidation: 0.0019 },
};

export const DELIVERY_FEE = 0.0002;
export const SYSTEMIC_RISK_FEE = 0.000025;

// ── Expirations ────────────────────────────────────────────────────────
export const EXPIRATION_COUNTS = {
  DAILY: 2,
  WEEKLY: 3,
  MONTHLY: 2,
} as const;

export const STRIKE_UPDATE_TIME_UTC = "08:00";
export const EXPIRATION_TIME_UTC = "08:00";
