import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAccountState, getAccountHistory, getPositions } from "../account.js";
import { deposit, withdraw, transfer } from "../collateral.js";
import { calculateUserRisk, MM_MULTIPLIER } from "../risk.js";
import { getMMPConfig, setMMPConfig } from "../mmp.js";

// ---------------------------------------------------------------------------
// Shared mock client
// ---------------------------------------------------------------------------

function createMockClient() {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
}

// ---------------------------------------------------------------------------
// account.ts
// ---------------------------------------------------------------------------

describe("getAccountState", () => {
  it("calls client.get with /account-state and the account param", async () => {
    const client = createMockClient();
    await getAccountState(client, "123");

    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith("/account-state", {
      account: "123",
    });
  });
});

describe("getAccountHistory", () => {
  it("calls client.get with /v2/account-history and all params", async () => {
    const client = createMockClient();

    await getAccountHistory(client, {
      cursor: "abc123",
      event_types: ["trade", "deposit"],
      actions: ["open", "close"],
      markets: ["BTC_USDC", "ETH_USDC"],
      transfer_type: "internal",
      sortKey: "timestamp",
      sortOrder: "desc",
    });

    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith("/v2/account-history", {
      cursor: "abc123",
      event_types: "trade,deposit",
      actions: "open,close",
      markets: "BTC_USDC,ETH_USDC",
      transfer_type: "internal",
      sortKey: "timestamp",
      sortOrder: "desc",
    });
  });

  it("passes an empty query object when no params are given", async () => {
    const client = createMockClient();
    await getAccountHistory(client);

    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith("/v2/account-history", {});
  });

  it("passes an empty query object when params are empty", async () => {
    const client = createMockClient();
    await getAccountHistory(client, {});

    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith("/v2/account-history", {});
  });

  it("includes only provided params in the query", async () => {
    const client = createMockClient();
    await getAccountHistory(client, { sortKey: "id", sortOrder: "asc" });

    expect(client.get).toHaveBeenCalledWith("/v2/account-history", {
      sortKey: "id",
      sortOrder: "asc",
    });
  });
});

describe("getPositions", () => {
  it("calls client.get with /positions and no params", async () => {
    const client = createMockClient();
    await getPositions(client);

    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith("/positions");
  });
});

// ---------------------------------------------------------------------------
// collateral.ts
// ---------------------------------------------------------------------------

describe("deposit", () => {
  it("calls client.post with /deposit and correct body", async () => {
    const client = createMockClient();
    await deposit(client, 1000, "BTC_USDC");

    expect(client.post).toHaveBeenCalledOnce();
    expect(client.post).toHaveBeenCalledWith("/deposit", {
      amount: 1000,
      pair: "BTC_USDC",
    });
  });

  it("includes signatureData spread into the body when provided", async () => {
    const client = createMockClient();
    const sig = { signature: "0xabc", nonce: "42", deadline: 9999 };
    await deposit(client, 500, "ETH_USDC", sig);

    expect(client.post).toHaveBeenCalledWith("/deposit", {
      amount: 500,
      pair: "ETH_USDC",
      signature: "0xabc",
      nonce: "42",
      deadline: 9999,
    });
  });
});

describe("withdraw", () => {
  it("calls client.post with /withdraw and correct body", async () => {
    const client = createMockClient();
    await withdraw(client, 250, "ARB_USDC");

    expect(client.post).toHaveBeenCalledOnce();
    expect(client.post).toHaveBeenCalledWith("/withdraw", {
      amount: 250,
      pair: "ARB_USDC",
    });
  });

  it("includes signatureData spread into the body when provided", async () => {
    const client = createMockClient();
    const sig = { signature: "0xdef", nonce: "7", deadline: 1234 };
    await withdraw(client, 100, "BTC_USDC", sig);

    expect(client.post).toHaveBeenCalledWith("/withdraw", {
      amount: 100,
      pair: "BTC_USDC",
      signature: "0xdef",
      nonce: "7",
      deadline: 1234,
    });
  });
});

describe("transfer", () => {
  it("calls client.post with /transfer and correct body", async () => {
    const client = createMockClient();
    await transfer(client, 300, "BTC_USDC", "ETH_USDC");

    expect(client.post).toHaveBeenCalledOnce();
    expect(client.post).toHaveBeenCalledWith("/transfer", {
      amount: 300,
      from_pair: "BTC_USDC",
      to_pair: "ETH_USDC",
    });
  });

  it("includes signatureData spread into the body when provided", async () => {
    const client = createMockClient();
    const sig = { signature: "0x123", nonce: "1", deadline: 5678 };
    await transfer(client, 50, "ETH_USDC", "ARB_USDC", sig);

    expect(client.post).toHaveBeenCalledWith("/transfer", {
      amount: 50,
      from_pair: "ETH_USDC",
      to_pair: "ARB_USDC",
      signature: "0x123",
      nonce: "1",
      deadline: 5678,
    });
  });
});

// ---------------------------------------------------------------------------
// risk.ts
// ---------------------------------------------------------------------------

describe("calculateUserRisk", () => {
  it("calls client.post with /calculate-user-risk and the portfolio", async () => {
    const client = createMockClient();
    const portfolio = {
      pair: "ETH_USDC" as const,
      positions: [
        { instrument_name: "ETH_USDC-PERPETUAL", size: 1, direction: "buy" as const },
        { instrument_name: "ETH_USDC-31OCT25-4000-C", size: -5, direction: "sell" as const },
      ],
    };

    await calculateUserRisk(client, portfolio);

    expect(client.post).toHaveBeenCalledOnce();
    expect(client.post).toHaveBeenCalledWith("/calculate-user-risk", portfolio);
  });
});

describe("MM_MULTIPLIER", () => {
  it("is 1.2", () => {
    expect(MM_MULTIPLIER).toBe(1.2);
  });
});

// ---------------------------------------------------------------------------
// mmp.ts
// ---------------------------------------------------------------------------

describe("getMMPConfig", () => {
  it("calls client.get with /mmp-config and the pair param", async () => {
    const client = createMockClient();
    await getMMPConfig(client, "BTC_USDC");

    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith("/mmp-config", {
      pair: "BTC_USDC",
    });
  });
});

describe("setMMPConfig", () => {
  it("calls client.post with /mmp-config merging config and signatureData", async () => {
    const client = createMockClient();

    const config = {
      smart_account_address: "0xABCDEF",
      pair_symbol: "ETH_USDC" as const,
      status: "active" as const,
      interval: 10,
      frozen_time: 300,
      quantity_limit: 100,
      delta_limit: 50,
      vega_limit: 1000,
    };

    const signatureData = {
      signature: "0xsig",
      nonce: "99",
      deadline: 12345,
      signer: "0xSIGNER",
    };

    await setMMPConfig(client, config, signatureData);

    expect(client.post).toHaveBeenCalledOnce();
    expect(client.post).toHaveBeenCalledWith("/mmp-config", {
      smart_account_address: "0xABCDEF",
      pair_symbol: "ETH_USDC",
      status: "active",
      interval: 10,
      frozen_time: 300,
      quantity_limit: 100,
      delta_limit: 50,
      vega_limit: 1000,
      signature: "0xsig",
      nonce: "99",
      deadline: 12345,
      signer: "0xSIGNER",
    });
  });

  it("works without optional risk limit fields", async () => {
    const client = createMockClient();

    const config = {
      smart_account_address: "0x111",
      pair_symbol: "BTC_USDC" as const,
      status: "frozen" as const,
      interval: 5,
      frozen_time: 60,
    };

    const signatureData = {
      signature: "0xsig2",
      nonce: "1",
      deadline: 9999,
      signer: "0xSIGNER2",
    };

    await setMMPConfig(client, config, signatureData);

    expect(client.post).toHaveBeenCalledWith("/mmp-config", {
      smart_account_address: "0x111",
      pair_symbol: "BTC_USDC",
      status: "frozen",
      interval: 5,
      frozen_time: 60,
      signature: "0xsig2",
      nonce: "1",
      deadline: 9999,
      signer: "0xSIGNER2",
    });
  });
});
