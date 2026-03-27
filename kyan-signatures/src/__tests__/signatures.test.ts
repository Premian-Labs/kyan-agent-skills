import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseUnits, zeroAddress, type Address } from "viem";

import {
  // domain.ts
  createEIP712Domain,
  SUPPORTED_CHAIN_IDS,
  // types.ts
  OrderTyped,
  UserLimitOrder,
  UserMarketOrder,
  UserComboOrder,
  CancelOrdersType,
  CancelAllOrdersType,
  FillRFQType,
  OneClickSignature,
  HeartbeatType,
  // sign.ts
  Direction,
  signLimitOrder,
  signMarketOrder,
  signComboOrder,
  signCancelOrders,
  signCancelAllOrders,
  signFillRFQ,
  signOneClickSession,
  signHeartbeat,
} from "../";

// ---------------------------------------------------------------------------
// Mock signing client factory
// ---------------------------------------------------------------------------

const DUMMY_SIG =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as const;

function createMockClient() {
  const signTypedData = vi.fn().mockResolvedValue(DUMMY_SIG);
  return { signTypedData };
}

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const TEST_CONTRACT: Address = "0x1234567890abcdef1234567890abcdef12345678";
const TEST_MAKER: Address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TEST_TAKER: Address = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function makeDomain(chainId: number = SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA) {
  return createEIP712Domain(chainId, TEST_CONTRACT);
}

// =========================================================================
// domain.ts
// =========================================================================

describe("domain.ts", () => {
  describe("SUPPORTED_CHAIN_IDS", () => {
    it("contains Arbitrum Sepolia (421614)", () => {
      expect(SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA).toBe(421614);
    });

    it("contains Arbitrum One (42161)", () => {
      expect(SUPPORTED_CHAIN_IDS.ARBITRUM_ONE).toBe(42161);
    });
  });

  describe("createEIP712Domain()", () => {
    it('returns domain with name "Premia"', () => {
      const domain = createEIP712Domain(
        SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA,
        TEST_CONTRACT
      );
      expect(domain.name).toBe("Premia");
    });

    it('returns domain with version "1"', () => {
      const domain = createEIP712Domain(
        SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA,
        TEST_CONTRACT
      );
      expect(domain.version).toBe("1");
    });

    it("preserves chainId for Arbitrum Sepolia", () => {
      const domain = createEIP712Domain(
        SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA,
        TEST_CONTRACT
      );
      expect(domain.chainId).toBe(421614);
    });

    it("preserves chainId for Arbitrum One", () => {
      const domain = createEIP712Domain(
        SUPPORTED_CHAIN_IDS.ARBITRUM_ONE,
        TEST_CONTRACT
      );
      expect(domain.chainId).toBe(42161);
    });

    it("preserves verifyingContract exactly", () => {
      const domain = createEIP712Domain(
        SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA,
        TEST_CONTRACT
      );
      expect(domain.verifyingContract).toBe(TEST_CONTRACT);
    });

    it("accepts an arbitrary numeric chainId", () => {
      const domain = createEIP712Domain(99999, TEST_CONTRACT);
      expect(domain.chainId).toBe(99999);
    });
  });
});

// =========================================================================
// types.ts
// =========================================================================

describe("types.ts", () => {
  // -----------------------------------------------------------------------
  // Existence & export
  // -----------------------------------------------------------------------
  describe("exports", () => {
    it("exports all 8 signature type arrays plus OrderTyped", () => {
      expect(OrderTyped).toBeDefined();
      expect(UserLimitOrder).toBeDefined();
      expect(UserMarketOrder).toBeDefined();
      expect(UserComboOrder).toBeDefined();
      expect(CancelOrdersType).toBeDefined();
      expect(CancelAllOrdersType).toBeDefined();
      expect(FillRFQType).toBeDefined();
      expect(OneClickSignature).toBeDefined();
      expect(HeartbeatType).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // OrderTyped (shared sub-type)
  // -----------------------------------------------------------------------
  describe("OrderTyped", () => {
    it("has exactly 3 fields", () => {
      expect(OrderTyped).toHaveLength(3);
    });

    it("field order is instrumentName, size, direction", () => {
      expect(OrderTyped[0].name).toBe("instrumentName");
      expect(OrderTyped[1].name).toBe("size");
      expect(OrderTyped[2].name).toBe("direction");
    });

    it("field types are string, uint256, uint8", () => {
      expect(OrderTyped[0].type).toBe("string");
      expect(OrderTyped[1].type).toBe("uint256");
      expect(OrderTyped[2].type).toBe("uint8");
    });
  });

  // -----------------------------------------------------------------------
  // UserLimitOrder
  // -----------------------------------------------------------------------
  describe("UserLimitOrder", () => {
    it("has exactly 10 fields", () => {
      expect(UserLimitOrder).toHaveLength(10);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = UserLimitOrder.map((f) => f.name);
      expect(names).toEqual([
        "deadline",
        "instrumentName",
        "size",
        "price",
        "taker",
        "maker",
        "direction",
        "isLiquidation",
        "isPostOnly",
        "mmp",
      ]);
    });

    it("field types match expected Solidity types", () => {
      const types = UserLimitOrder.map((f) => f.type);
      expect(types).toEqual([
        "uint256",
        "string",
        "uint256",
        "uint256",
        "address",
        "address",
        "uint8",
        "bool",
        "bool",
        "bool",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // UserMarketOrder
  // -----------------------------------------------------------------------
  describe("UserMarketOrder", () => {
    it("has exactly 4 fields", () => {
      expect(UserMarketOrder).toHaveLength(4);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = UserMarketOrder.map((f) => f.name);
      expect(names).toEqual(["deadline", "marketOrder", "limitPrice", "taker"]);
    });

    it("marketOrder references OrderTyped sub-type", () => {
      expect(UserMarketOrder[1].type).toBe("OrderTyped");
    });

    it("field types are correct", () => {
      const types = UserMarketOrder.map((f) => f.type);
      expect(types).toEqual(["uint256", "OrderTyped", "uint256", "address"]);
    });
  });

  // -----------------------------------------------------------------------
  // UserComboOrder
  // -----------------------------------------------------------------------
  describe("UserComboOrder", () => {
    it("has exactly 5 fields", () => {
      expect(UserComboOrder).toHaveLength(5);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = UserComboOrder.map((f) => f.name);
      expect(names).toEqual([
        "deadline",
        "marketOrders",
        "limitNetPrice",
        "limitPerpPrice",
        "taker",
      ]);
    });

    it("marketOrders is an array of OrderTyped", () => {
      expect(UserComboOrder[1].type).toBe("OrderTyped[]");
    });

    it("uses int256 for net and perp price fields (signed)", () => {
      expect(UserComboOrder[2].type).toBe("int256");
      expect(UserComboOrder[3].type).toBe("int256");
    });
  });

  // -----------------------------------------------------------------------
  // CancelOrdersType
  // -----------------------------------------------------------------------
  describe("CancelOrdersType", () => {
    it("has exactly 3 fields", () => {
      expect(CancelOrdersType).toHaveLength(3);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = CancelOrdersType.map((f) => f.name);
      expect(names).toEqual(["deadline", "maker", "orderIds"]);
    });

    it("orderIds is string[]", () => {
      expect(CancelOrdersType[2].type).toBe("string[]");
    });
  });

  // -----------------------------------------------------------------------
  // CancelAllOrdersType
  // -----------------------------------------------------------------------
  describe("CancelAllOrdersType", () => {
    it("has exactly 2 fields", () => {
      expect(CancelAllOrdersType).toHaveLength(2);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = CancelAllOrdersType.map((f) => f.name);
      expect(names).toEqual(["deadline", "maker"]);
    });

    it("field types are uint256 and address", () => {
      const types = CancelAllOrdersType.map((f) => f.type);
      expect(types).toEqual(["uint256", "address"]);
    });
  });

  // -----------------------------------------------------------------------
  // FillRFQType
  // -----------------------------------------------------------------------
  describe("FillRFQType", () => {
    it("has exactly 3 fields", () => {
      expect(FillRFQType).toHaveLength(3);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = FillRFQType.map((f) => f.name);
      expect(names).toEqual(["deadline", "taker", "responseId"]);
    });

    it("responseId is a string", () => {
      expect(FillRFQType[2].type).toBe("string");
    });
  });

  // -----------------------------------------------------------------------
  // OneClickSignature
  // -----------------------------------------------------------------------
  describe("OneClickSignature", () => {
    it("has exactly 3 fields", () => {
      expect(OneClickSignature).toHaveLength(3);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = OneClickSignature.map((f) => f.name);
      expect(names).toEqual(["deadline", "user", "bindToIp"]);
    });

    it("bindToIp is bool", () => {
      expect(OneClickSignature[2].type).toBe("bool");
    });
  });

  // -----------------------------------------------------------------------
  // HeartbeatType
  // -----------------------------------------------------------------------
  describe("HeartbeatType", () => {
    it("has exactly 3 fields", () => {
      expect(HeartbeatType).toHaveLength(3);
    });

    it("fields are in the exact EIP-712 order", () => {
      const names = HeartbeatType.map((f) => f.name);
      expect(names).toEqual(["deadline", "maker", "timeout"]);
    });

    it("timeout is uint256", () => {
      expect(HeartbeatType[2].type).toBe("uint256");
    });
  });
});

// =========================================================================
// sign.ts
// =========================================================================

describe("sign.ts", () => {
  let client: ReturnType<typeof createMockClient>;
  let domain: ReturnType<typeof makeDomain>;

  beforeEach(() => {
    client = createMockClient();
    domain = makeDomain();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  // Helper: expected unix timestamp under fake timer
  const NOW_UNIX = Math.floor(
    new Date("2025-06-15T12:00:00Z").getTime() / 1000
  );

  // -----------------------------------------------------------------------
  // Direction constant
  // -----------------------------------------------------------------------
  describe("Direction", () => {
    it("BUY is 0", () => {
      expect(Direction.BUY).toBe(0);
    });

    it("SELL is 1", () => {
      expect(Direction.SELL).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // signLimitOrder
  // -----------------------------------------------------------------------
  describe("signLimitOrder", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "10",
        price: "1850.50",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("accepts contracts param for options", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "5",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.size).toBe(parseUnits("5", 6));
    });

    it("accepts amount param for perps", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        amount: "2.5",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.size).toBe(parseUnits("2.5", 6));
    });

    it("throws if neither contracts nor amount is provided", async () => {
      await expect(
        signLimitOrder(client, domain, {
          instrumentName: "ETH-PERP",
          price: "100",
          direction: "buy",
          maker: TEST_MAKER,
        })
      ).rejects.toThrow(
        "Either 'contracts' (options) or 'amount' (perps) must be provided"
      );
    });

    it('maps direction "buy" to 0', async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.direction).toBe(0);
    });

    it('maps direction "sell" to 1', async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "sell",
        maker: TEST_MAKER,
      });

      expect(result.message.direction).toBe(1);
    });

    it("accepts numeric direction values directly", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: 1,
        maker: TEST_MAKER,
      });

      expect(result.message.direction).toBe(1);
    });

    it("defaults taker to zeroAddress when not provided", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.taker).toBe(zeroAddress);
    });

    it("defaults taker to zeroAddress when explicitly null", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
        taker: null,
      });

      expect(result.message.taker).toBe(zeroAddress);
    });

    it("preserves taker when explicitly set", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
        taker: TEST_TAKER,
      });

      expect(result.message.taker).toBe(TEST_TAKER);
    });

    it("deadline is ~30 seconds from now", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.deadline).toBe(BigInt(NOW_UNIX + 30));
    });

    it("converts price to 6-decimal bigint", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "1850.50",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.price).toBe(parseUnits("1850.50", 6));
    });

    it("converts size to 6-decimal bigint", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "3.14",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.size).toBe(parseUnits("3.14", 6));
    });

    it("defaults boolean flags to false", async () => {
      const result = await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(result.message.isLiquidation).toBe(false);
      expect(result.message.isPostOnly).toBe(false);
      expect(result.message.mmp).toBe(false);
    });

    it("passes correct types and primaryType to signTypedData", async () => {
      await signLimitOrder(client, domain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.domain).toEqual(domain);
      expect(args.types).toEqual({ UserLimitOrder });
      expect(args.primaryType).toBe("UserLimitOrder");
    });
  });

  // -----------------------------------------------------------------------
  // signMarketOrder
  // -----------------------------------------------------------------------
  describe("signMarketOrder", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signMarketOrder(client, domain, {
        instrumentName: "ETH-PERP",
        size: "5",
        direction: "buy",
        limitPrice: "1900",
      });

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("builds correct nested message with OrderTyped sub-object", async () => {
      const result = await signMarketOrder(client, domain, {
        instrumentName: "ETH-PERP",
        size: "5",
        direction: "sell",
        limitPrice: "1900",
      });

      expect(result.message.marketOrder).toEqual({
        instrumentName: "ETH-PERP",
        size: parseUnits("5", 6),
        direction: 1,
      });
    });

    it("converts limitPrice to 6-decimal bigint", async () => {
      const result = await signMarketOrder(client, domain, {
        instrumentName: "ETH-PERP",
        size: "1",
        direction: "buy",
        limitPrice: "2000.25",
      });

      expect(result.message.limitPrice).toBe(parseUnits("2000.25", 6));
    });

    it("defaults taker to zeroAddress", async () => {
      const result = await signMarketOrder(client, domain, {
        instrumentName: "ETH-PERP",
        size: "1",
        direction: "buy",
        limitPrice: "1900",
      });

      expect(result.message.taker).toBe(zeroAddress);
    });

    it("passes OrderTyped in the types map", async () => {
      await signMarketOrder(client, domain, {
        instrumentName: "ETH-PERP",
        size: "1",
        direction: "buy",
        limitPrice: "1900",
      });

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ UserMarketOrder, OrderTyped });
      expect(args.primaryType).toBe("UserMarketOrder");
    });

    it("deadline is ~30 seconds from now", async () => {
      const result = await signMarketOrder(client, domain, {
        instrumentName: "ETH-PERP",
        size: "1",
        direction: "buy",
        limitPrice: "1900",
      });

      expect(result.deadline).toBe(BigInt(NOW_UNIX + 30));
    });
  });

  // -----------------------------------------------------------------------
  // signComboOrder
  // -----------------------------------------------------------------------
  describe("signComboOrder", () => {
    const twoLegs = {
      legs: [
        { instrumentName: "ETH-PERP", size: "10", direction: "buy" as const },
        {
          instrumentName: "ETH-20250620-2000-C",
          size: "5",
          direction: "sell" as const,
        },
      ],
      limitNetPrice: "50.5",
      limitPerpPrice: "-10.25",
    };

    it("returns signature, deadline, and message", async () => {
      const result = await signComboOrder(client, domain, twoLegs);

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("builds correct array of OrderTyped legs", async () => {
      const result = await signComboOrder(client, domain, twoLegs);

      expect(result.message.marketOrders).toHaveLength(2);
      expect(result.message.marketOrders[0]).toEqual({
        instrumentName: "ETH-PERP",
        size: parseUnits("10", 6),
        direction: 0,
      });
      expect(result.message.marketOrders[1]).toEqual({
        instrumentName: "ETH-20250620-2000-C",
        size: parseUnits("5", 6),
        direction: 1,
      });
    });

    it("converts limitNetPrice to 6-decimal bigint", async () => {
      const result = await signComboOrder(client, domain, twoLegs);
      expect(result.message.limitNetPrice).toBe(parseUnits("50.5", 6));
    });

    it("converts limitPerpPrice to 6-decimal bigint (handles negative)", async () => {
      const result = await signComboOrder(client, domain, twoLegs);
      expect(result.message.limitPerpPrice).toBe(parseUnits("-10.25", 6));
    });

    it("defaults taker to zeroAddress", async () => {
      const result = await signComboOrder(client, domain, twoLegs);
      expect(result.message.taker).toBe(zeroAddress);
    });

    it("preserves taker when explicitly set", async () => {
      const result = await signComboOrder(client, domain, {
        ...twoLegs,
        taker: TEST_TAKER,
      });

      expect(result.message.taker).toBe(TEST_TAKER);
    });

    it("passes OrderTyped in the types map for nested struct", async () => {
      await signComboOrder(client, domain, twoLegs);

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ UserComboOrder, OrderTyped });
      expect(args.primaryType).toBe("UserComboOrder");
    });
  });

  // -----------------------------------------------------------------------
  // signCancelOrders
  // -----------------------------------------------------------------------
  describe("signCancelOrders", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signCancelOrders(client, domain, TEST_MAKER, [
        "order-1",
        "order-2",
      ]);

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("includes maker in the message", async () => {
      const result = await signCancelOrders(client, domain, TEST_MAKER, [
        "order-1",
      ]);

      expect(result.message.maker).toBe(TEST_MAKER);
    });

    it("includes orderIds array in the message", async () => {
      const ids = ["order-abc", "order-def", "order-ghi"];
      const result = await signCancelOrders(client, domain, TEST_MAKER, ids);

      expect(result.message.orderIds).toEqual(ids);
    });

    it("passes correct types and primaryType", async () => {
      await signCancelOrders(client, domain, TEST_MAKER, ["order-1"]);

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ CancelOrdersType });
      expect(args.primaryType).toBe("CancelOrdersType");
    });

    it("deadline is ~30 seconds from now", async () => {
      const result = await signCancelOrders(client, domain, TEST_MAKER, [
        "order-1",
      ]);

      expect(result.deadline).toBe(BigInt(NOW_UNIX + 30));
    });
  });

  // -----------------------------------------------------------------------
  // signCancelAllOrders
  // -----------------------------------------------------------------------
  describe("signCancelAllOrders", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signCancelAllOrders(client, domain, TEST_MAKER);

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("message contains only deadline and maker", async () => {
      const result = await signCancelAllOrders(client, domain, TEST_MAKER);

      expect(Object.keys(result.message)).toEqual(
        expect.arrayContaining(["deadline", "maker"])
      );
      expect(Object.keys(result.message)).toHaveLength(2);
    });

    it("includes maker in the message", async () => {
      const result = await signCancelAllOrders(client, domain, TEST_MAKER);
      expect(result.message.maker).toBe(TEST_MAKER);
    });

    it("passes correct types and primaryType", async () => {
      await signCancelAllOrders(client, domain, TEST_MAKER);

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ CancelAllOrdersType });
      expect(args.primaryType).toBe("CancelAllOrdersType");
    });

    it("deadline is ~30 seconds from now", async () => {
      const result = await signCancelAllOrders(client, domain, TEST_MAKER);
      expect(result.deadline).toBe(BigInt(NOW_UNIX + 30));
    });
  });

  // -----------------------------------------------------------------------
  // signFillRFQ
  // -----------------------------------------------------------------------
  describe("signFillRFQ", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signFillRFQ(
        client,
        domain,
        TEST_TAKER,
        "resp-12345"
      );

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("includes taker in the message", async () => {
      const result = await signFillRFQ(
        client,
        domain,
        TEST_TAKER,
        "resp-12345"
      );

      expect(result.message.taker).toBe(TEST_TAKER);
    });

    it("includes responseId in the message", async () => {
      const result = await signFillRFQ(
        client,
        domain,
        TEST_TAKER,
        "resp-12345"
      );

      expect(result.message.responseId).toBe("resp-12345");
    });

    it("passes correct types and primaryType", async () => {
      await signFillRFQ(client, domain, TEST_TAKER, "resp-12345");

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ FillRFQType });
      expect(args.primaryType).toBe("FillRFQType");
    });

    it("deadline is ~30 seconds from now", async () => {
      const result = await signFillRFQ(
        client,
        domain,
        TEST_TAKER,
        "resp-12345"
      );

      expect(result.deadline).toBe(BigInt(NOW_UNIX + 30));
    });
  });

  // -----------------------------------------------------------------------
  // signOneClickSession
  // -----------------------------------------------------------------------
  describe("signOneClickSession", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signOneClickSession(client, domain, TEST_MAKER);

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("deadline is 3600 seconds from now (not 30)", async () => {
      const result = await signOneClickSession(client, domain, TEST_MAKER);
      expect(result.deadline).toBe(BigInt(NOW_UNIX + 3600));
    });

    it("includes user address in the message", async () => {
      const result = await signOneClickSession(client, domain, TEST_MAKER);
      expect(result.message.user).toBe(TEST_MAKER);
    });

    it("defaults bindToIp to true", async () => {
      const result = await signOneClickSession(client, domain, TEST_MAKER);
      expect(result.message.bindToIp).toBe(true);
    });

    it("allows bindToIp to be set to false", async () => {
      const result = await signOneClickSession(
        client,
        domain,
        TEST_MAKER,
        false
      );

      expect(result.message.bindToIp).toBe(false);
    });

    it("passes correct types and primaryType", async () => {
      await signOneClickSession(client, domain, TEST_MAKER);

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ OneClickSignature });
      expect(args.primaryType).toBe("OneClickSignature");
    });
  });

  // -----------------------------------------------------------------------
  // signHeartbeat
  // -----------------------------------------------------------------------
  describe("signHeartbeat", () => {
    it("returns signature, deadline, and message", async () => {
      const result = await signHeartbeat(client, domain, TEST_MAKER, 120);

      expect(result).toHaveProperty("signature", DUMMY_SIG);
      expect(result).toHaveProperty("deadline");
      expect(result).toHaveProperty("message");
    });

    it("includes maker in the message", async () => {
      const result = await signHeartbeat(client, domain, TEST_MAKER, 120);
      expect(result.message.maker).toBe(TEST_MAKER);
    });

    it("includes timeout as bigint in the message", async () => {
      const result = await signHeartbeat(client, domain, TEST_MAKER, 120);
      expect(result.message.timeout).toBe(BigInt(120));
    });

    it("accepts bigint timeout directly", async () => {
      const result = await signHeartbeat(
        client,
        domain,
        TEST_MAKER,
        BigInt(300)
      );

      expect(result.message.timeout).toBe(BigInt(300));
    });

    it("deadline is ~30 seconds from now", async () => {
      const result = await signHeartbeat(client, domain, TEST_MAKER, 120);
      expect(result.deadline).toBe(BigInt(NOW_UNIX + 30));
    });

    it("passes correct types and primaryType", async () => {
      await signHeartbeat(client, domain, TEST_MAKER, 120);

      const args = client.signTypedData.mock.calls[0]![0];
      expect(args.types).toEqual({ HeartbeatType });
      expect(args.primaryType).toBe("HeartbeatType");
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting: domain is always forwarded
  // -----------------------------------------------------------------------
  describe("domain forwarding", () => {
    it("all sign functions forward the domain to signTypedData", async () => {
      const sepoliaDomain = makeDomain(SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA);
      const arbDomain = makeDomain(SUPPORTED_CHAIN_IDS.ARBITRUM_ONE);

      await signLimitOrder(client, sepoliaDomain, {
        instrumentName: "ETH-PERP",
        contracts: "1",
        price: "100",
        direction: "buy",
        maker: TEST_MAKER,
      });

      expect(client.signTypedData.mock.calls[0]![0].domain).toEqual(
        sepoliaDomain
      );

      await signCancelAllOrders(client, arbDomain, TEST_MAKER);

      expect(client.signTypedData.mock.calls[1]![0].domain).toEqual(arbDomain);
    });
  });
});
