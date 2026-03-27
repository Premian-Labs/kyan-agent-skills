import { describe, it, expect } from "vitest";

import {
  CHAIN_IDS,
  ENDPOINTS,
  USDC_DECIMALS,
  RATE_LIMITS,
  WS_RECONNECT,
  SESSION_RECOVERY,
  DEADLINES,
  PERP_FEES,
  OPTIONS_FEES,
  DELIVERY_FEE,
  SYSTEMIC_RISK_FEE,
  CONTRACTS,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
} from "../constants.js";

import { DIRECTION_MAP } from "../types.js";

// ---------------------------------------------------------------------------
// CHAIN_IDS
// ---------------------------------------------------------------------------

describe("CHAIN_IDS", () => {
  it("ARBITRUM_SEPOLIA is 421614", () => {
    expect(CHAIN_IDS.ARBITRUM_SEPOLIA).toBe(421614);
  });

  it("ARBITRUM_ONE is 42161", () => {
    expect(CHAIN_IDS.ARBITRUM_ONE).toBe(42161);
  });
});

// ---------------------------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------------------------

describe("ENDPOINTS", () => {
  it("REST_STAGING points to staging.kyan.sh", () => {
    expect(ENDPOINTS.REST_STAGING).toBe("https://staging.kyan.sh");
  });

  it("REST_PRODUCTION points to api.kyan.blue", () => {
    expect(ENDPOINTS.REST_PRODUCTION).toBe("https://api.kyan.blue");
  });

  it("WS_STAGING points to staging.kyan.sh/ws", () => {
    expect(ENDPOINTS.WS_STAGING).toBe("wss://staging.kyan.sh/ws");
  });

  it("WS_PRODUCTION points to api.kyan.blue/ws", () => {
    expect(ENDPOINTS.WS_PRODUCTION).toBe("wss://api.kyan.blue/ws");
  });

  it("MCP_SERVER points to docs.kyan.blue/mcp", () => {
    expect(ENDPOINTS.MCP_SERVER).toBe("https://docs.kyan.blue/mcp");
  });
});

// ---------------------------------------------------------------------------
// USDC_DECIMALS
// ---------------------------------------------------------------------------

describe("USDC_DECIMALS", () => {
  it("is 6", () => {
    expect(USDC_DECIMALS).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// DIRECTION_MAP
// ---------------------------------------------------------------------------

describe("DIRECTION_MAP", () => {
  it("maps buy to 0", () => {
    expect(DIRECTION_MAP.buy).toBe(0);
  });

  it("maps sell to 1", () => {
    expect(DIRECTION_MAP.sell).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// RATE_LIMITS
// ---------------------------------------------------------------------------

describe("RATE_LIMITS", () => {
  it("MARKET_DATA allows 20 requests per 1 second", () => {
    expect(RATE_LIMITS.MARKET_DATA).toEqual({ requests: 20, perSeconds: 1 });
  });

  it("TRADING allows 5 requests per 1 second", () => {
    expect(RATE_LIMITS.TRADING).toEqual({ requests: 5, perSeconds: 1 });
  });

  it("ACCOUNT allows 2 requests per 1 second", () => {
    expect(RATE_LIMITS.ACCOUNT).toEqual({ requests: 2, perSeconds: 1 });
  });

  it("RFQ allows 6 requests per 60 seconds", () => {
    expect(RATE_LIMITS.RFQ).toEqual({ requests: 6, perSeconds: 60 });
  });
});

// ---------------------------------------------------------------------------
// WS_RECONNECT
// ---------------------------------------------------------------------------

describe("WS_RECONNECT", () => {
  it("MAX_ATTEMPTS is 5", () => {
    expect(WS_RECONNECT.MAX_ATTEMPTS).toBe(5);
  });

  it("INITIAL_INTERVAL_MS is 1000", () => {
    expect(WS_RECONNECT.INITIAL_INTERVAL_MS).toBe(1000);
  });

  it("MAX_INTERVAL_MS is 30000", () => {
    expect(WS_RECONNECT.MAX_INTERVAL_MS).toBe(30000);
  });
});

// ---------------------------------------------------------------------------
// SESSION_RECOVERY
// ---------------------------------------------------------------------------

describe("SESSION_RECOVERY", () => {
  it("DEFAULT_TTL_SECONDS is 30", () => {
    expect(SESSION_RECOVERY.DEFAULT_TTL_SECONDS).toBe(30);
  });

  it("MAX_BUFFERED_MESSAGES is 1000", () => {
    expect(SESSION_RECOVERY.MAX_BUFFERED_MESSAGES).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// DEADLINES
// ---------------------------------------------------------------------------

describe("DEADLINES", () => {
  it("ORDER_SECONDS is 30", () => {
    expect(DEADLINES.ORDER_SECONDS).toBe(30);
  });

  it("ONE_CLICK_SESSION_SECONDS is 3600", () => {
    expect(DEADLINES.ONE_CLICK_SESSION_SECONDS).toBe(3600);
  });
});

// ---------------------------------------------------------------------------
// Fee Schedules
// ---------------------------------------------------------------------------

describe("PERP_FEES", () => {
  it("has entries for all three trading pairs", () => {
    expect(PERP_FEES).toHaveProperty("BTC_USDC");
    expect(PERP_FEES).toHaveProperty("ETH_USDC");
    expect(PERP_FEES).toHaveProperty("ARB_USDC");
  });

  it("BTC_USDC maker fee is 0", () => {
    expect(PERP_FEES.BTC_USDC.maker).toBe(0);
  });

  it("BTC_USDC taker fee is 0.0008", () => {
    expect(PERP_FEES.BTC_USDC.taker).toBe(0.0008);
  });

  it("BTC_USDC liquidation fee is 0.0015", () => {
    expect(PERP_FEES.BTC_USDC.liquidation).toBe(0.0015);
  });

  it("ETH_USDC has maker 0, taker 0.0008, liquidation 0.0015", () => {
    expect(PERP_FEES.ETH_USDC).toEqual({
      maker: 0,
      taker: 0.0008,
      liquidation: 0.0015,
    });
  });

  it("ARB_USDC has maker 0, taker 0.0008, liquidation 0.0025", () => {
    expect(PERP_FEES.ARB_USDC).toEqual({
      maker: 0,
      taker: 0.0008,
      liquidation: 0.0025,
    });
  });
});

describe("OPTIONS_FEES", () => {
  it("has entries for all three trading pairs", () => {
    expect(OPTIONS_FEES).toHaveProperty("BTC_USDC");
    expect(OPTIONS_FEES).toHaveProperty("ETH_USDC");
    expect(OPTIONS_FEES).toHaveProperty("ARB_USDC");
  });

  it("BTC_USDC maker fee is 0.0004", () => {
    expect(OPTIONS_FEES.BTC_USDC.maker).toBe(0.0004);
  });

  it("BTC_USDC taker fee is 0.0004", () => {
    expect(OPTIONS_FEES.BTC_USDC.taker).toBe(0.0004);
  });

  it("BTC_USDC liquidation fee is 0.0019", () => {
    expect(OPTIONS_FEES.BTC_USDC.liquidation).toBe(0.0019);
  });

  it("ETH_USDC has maker 0.0004, taker 0.0004, liquidation 0.0019", () => {
    expect(OPTIONS_FEES.ETH_USDC).toEqual({
      maker: 0.0004,
      taker: 0.0004,
      liquidation: 0.0019,
    });
  });

  it("ARB_USDC has maker 0.0008, taker 0.0008, liquidation 0.0019", () => {
    expect(OPTIONS_FEES.ARB_USDC).toEqual({
      maker: 0.0008,
      taker: 0.0008,
      liquidation: 0.0019,
    });
  });
});

// ---------------------------------------------------------------------------
// Delivery & Systemic Risk Fees
// ---------------------------------------------------------------------------

describe("DELIVERY_FEE", () => {
  it("is 0.0002", () => {
    expect(DELIVERY_FEE).toBe(0.0002);
  });
});

describe("SYSTEMIC_RISK_FEE", () => {
  it("is 0.000025", () => {
    expect(SYSTEMIC_RISK_FEE).toBe(0.000025);
  });
});

// ---------------------------------------------------------------------------
// CONTRACTS
// ---------------------------------------------------------------------------

describe("CONTRACTS", () => {
  it("MOCK_USDC_SEPOLIA is the correct address", () => {
    expect(CONTRACTS.MOCK_USDC_SEPOLIA).toBe(
      "0x07a7D6b723d0aa62cD78da00452Ba3cD3b72C3d7",
    );
  });
});

// ---------------------------------------------------------------------------
// EIP-712 Domain
// ---------------------------------------------------------------------------

describe("EIP-712 Domain", () => {
  it("EIP712_DOMAIN_NAME is 'Premia'", () => {
    expect(EIP712_DOMAIN_NAME).toBe("Premia");
  });

  it("EIP712_DOMAIN_VERSION is '1'", () => {
    expect(EIP712_DOMAIN_VERSION).toBe("1");
  });
});
