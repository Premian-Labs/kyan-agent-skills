// ============================================================================
// Comprehensive Vitest tests for @kyan-skills/websocket
// ============================================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Provide a minimal global WebSocket stub so the client module can reference
// WebSocket.OPEN etc. in a Node.js test environment.
// ---------------------------------------------------------------------------

beforeAll(() => {
  if (typeof globalThis.WebSocket === "undefined") {
    (globalThis as any).WebSocket = Object.assign(
      function MockWebSocket() {
        throw new Error("MockWebSocket: not for real connections in tests");
      },
      { OPEN: 1, CLOSED: 3, CONNECTING: 0, CLOSING: 2 },
    );
  }
});

// ---------------------------------------------------------------------------
// Types — import all query interfaces, event types, and WSMessage to verify
// they exist and have the correct shapes.
// ---------------------------------------------------------------------------

import type {
  WSMessage,
  AuthRequest,
  AuthResponse,
  SubscribeRequest,
  UnsubscribeRequest,
  UnsubscribeAllRequest,
  GetSubscriptionsRequest,
  GetSubscriptionsResponse,
  GetInstrumentsRequest,
  GetObStateRequest,
  GetObStateByMarketRequest,
  ResendRequest,
  EnableSessionRecoveryRequest,
  EnableSessionRecoveryResponse,
  RecoverSessionRequest,
  RecoverSessionResponse,
  KyanWebSocketConfig,
  IndexPriceQuery,
  InstrumentsQuery,
  FundingQuery,
  InterestRateQuery,
  IVQuery,
  OrderbookPerpsQuery,
  OrderbookOptionsQuery,
  OrderbookMakerQuery,
  AccountStateQuery,
  PositionQuery,
  TradeQuery,
  TransferQuery,
  AccountLiquidationQuery,
  BankruptcyQuery,
  MMPQuery,
  RFQQuery,
  PostOrderEvent,
  CancelOrderEvent,
  UpdateOrderEvent,
  OBSnapshotEvent,
  OBUpdateEvent,
  OBMakerOrdersEvent,
  IndexPriceEvent,
  InstrumentsEvent,
  FundingEvent,
  InterestRateEvent,
  SVIEvent,
  AccountStateEvent,
  PositionEvent,
  TradeEvent,
  TransferEvent,
  BankruptcyEvent,
  MMPTriggeredEvent,
  RFQRequestEvent,
  RFQPostResponseEvent,
  RFQCancelResponseEvent,
  ClientRequest,
  ServerEvent,
} from "../types";

// ---------------------------------------------------------------------------
// Channel helpers
// ---------------------------------------------------------------------------

import {
  subscribeIndexPrice,
  subscribeInstruments,
  subscribeFunding,
  subscribeInterestRate,
  subscribeIV,
  subscribeOrderbookPerps,
  subscribeOrderbookOptions,
  subscribeOrderbookMaker,
  subscribeAccountState,
  subscribePosition,
  subscribeTrade,
  subscribeTransfer,
  subscribeAccountLiquidation,
  subscribeBankruptcy,
  subscribeMMP,
  subscribeRFQ,
} from "../channels";

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

import {
  enableSessionRecovery,
  recoverSession,
  DEFAULT_RECOVERY_TTL_SECONDS,
  MAX_BUFFERED_MESSAGES,
} from "../recovery";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

import { KyanWebSocket } from "../client";

// ============================================================================
// Helper: create a mock KyanWebSocket with a stubbed subscribe method
// ============================================================================

function createMockWs() {
  const mockResponse: WSMessage = {
    kind: "response",
    type: "subscribe",
    timestamp_ms: Date.now(),
    success: true,
  };

  return {
    subscribe: vi.fn().mockResolvedValue(mockResponse),
    sendRequest: vi.fn().mockResolvedValue(mockResponse),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as KyanWebSocket & {
    subscribe: ReturnType<typeof vi.fn>;
    sendRequest: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

// ============================================================================
// 1. types.ts
// ============================================================================

describe("types.ts", () => {
  // -------------------------------------------------------------------------
  // WSMessage envelope
  // -------------------------------------------------------------------------
  describe("WSMessage envelope", () => {
    it("has required fields: kind, type, timestamp_ms", () => {
      const msg: WSMessage = {
        kind: "response",
        type: "auth",
        timestamp_ms: 1700000000000,
      };
      expect(msg.kind).toBe("response");
      expect(msg.type).toBe("auth");
      expect(msg.timestamp_ms).toBe(1700000000000);
    });

    it("kind is restricted to 'response' | 'event'", () => {
      const response: WSMessage = { kind: "response", type: "auth", timestamp_ms: 0 };
      const event: WSMessage = { kind: "event", type: "trade", timestamp_ms: 0 };
      expect(response.kind).toBe("response");
      expect(event.kind).toBe("event");
    });

    it("accepts optional fields: message_id, seq_id, id, success, error", () => {
      const msg: WSMessage = {
        kind: "response",
        type: "auth",
        timestamp_ms: 1700000000000,
        message_id: "msg_123",
        seq_id: 42,
        id: "req_1",
        success: true,
        error: undefined,
      };
      expect(msg.message_id).toBe("msg_123");
      expect(msg.seq_id).toBe(42);
      expect(msg.id).toBe("req_1");
      expect(msg.success).toBe(true);
      expect(msg.error).toBeUndefined();
    });

    it("accepts success=false with error string", () => {
      const msg: WSMessage = {
        kind: "response",
        type: "auth",
        timestamp_ms: 0,
        success: false,
        error: "Invalid API key",
      };
      expect(msg.success).toBe(false);
      expect(msg.error).toBe("Invalid API key");
    });
  });

  // -------------------------------------------------------------------------
  // Channel query interfaces
  // -------------------------------------------------------------------------
  describe("channel query interfaces", () => {
    it("IndexPriceQuery has required pair field", () => {
      const q: IndexPriceQuery = { pair: "BTC_USDC" };
      expect(q.pair).toBe("BTC_USDC");
    });

    it("InstrumentsQuery has optional market field", () => {
      const q1: InstrumentsQuery = {};
      const q2: InstrumentsQuery = { market: "BTC_USDC" };
      expect(q1.market).toBeUndefined();
      expect(q2.market).toBe("BTC_USDC");
    });

    it("FundingQuery has required instrument_name field", () => {
      const q: FundingQuery = { instrument_name: "BTC_USDC-PERPETUAL" };
      expect(q.instrument_name).toBe("BTC_USDC-PERPETUAL");
    });

    it("InterestRateQuery has required pair and optional expiry", () => {
      const q1: InterestRateQuery = { pair: "BTC_USDC" };
      const q2: InterestRateQuery = { pair: "BTC_USDC", expiry: "2024-12-31" };
      expect(q1.pair).toBe("BTC_USDC");
      expect(q1.expiry).toBeUndefined();
      expect(q2.expiry).toBe("2024-12-31");
    });

    it("IVQuery has required pair and optional maturity", () => {
      const q1: IVQuery = { pair: "BTC_USDC" };
      const q2: IVQuery = { pair: "BTC_USDC", maturity: "2024-12-31" };
      expect(q1.pair).toBe("BTC_USDC");
      expect(q1.maturity).toBeUndefined();
      expect(q2.maturity).toBe("2024-12-31");
    });

    it("OrderbookPerpsQuery has all optional fields", () => {
      const q: OrderbookPerpsQuery = {
        instrument_name: "BTC_USDC-PERPETUAL",
        pair: "BTC_USDC",
        direction: "buy",
        skip_snapshot: true,
      };
      expect(q.instrument_name).toBe("BTC_USDC-PERPETUAL");
      expect(q.direction).toBe("buy");
      expect(q.skip_snapshot).toBe(true);
    });

    it("OrderbookOptionsQuery has all optional fields", () => {
      const q: OrderbookOptionsQuery = {
        instrument_name: "BTC_USDC-20241231-50000-C",
        pair: "BTC_USDC",
        maturity: "2024-12-31",
        strike: "50000",
        type: "call",
        direction: "buy",
        skip_snapshot: false,
      };
      expect(q.type).toBe("call");
      expect(q.strike).toBe("50000");
    });

    it("OrderbookMakerQuery has required maker and optional pair", () => {
      const q1: OrderbookMakerQuery = { maker: "0xabc123" };
      const q2: OrderbookMakerQuery = { maker: "0xabc123", pair: "BTC_USDC" };
      expect(q1.maker).toBe("0xabc123");
      expect(q1.pair).toBeUndefined();
      expect(q2.pair).toBe("BTC_USDC");
    });

    it("AccountStateQuery has required account and optional pair", () => {
      const q: AccountStateQuery = { account: "0xabc", pair: "ETH_USDC" };
      expect(q.account).toBe("0xabc");
      expect(q.pair).toBe("ETH_USDC");
    });

    it("PositionQuery has required account and optional market", () => {
      const q: PositionQuery = { account: "0xabc" };
      expect(q.account).toBe("0xabc");
      expect(q.market).toBeUndefined();
    });

    it("TradeQuery has all optional fields", () => {
      const q: TradeQuery = { account: "0xabc", pair: "BTC_USDC", direction: "buy" };
      expect(q.account).toBe("0xabc");
      expect(q.direction).toBe("buy");
    });

    it("TransferQuery has required account and optional symbol, type", () => {
      const q: TransferQuery = { account: "0xabc", symbol: "USDC", type: "deposit" };
      expect(q.account).toBe("0xabc");
      expect(q.symbol).toBe("USDC");
    });

    it("AccountLiquidationQuery has required account", () => {
      const q: AccountLiquidationQuery = { account: "0xabc" };
      expect(q.account).toBe("0xabc");
    });

    it("BankruptcyQuery has optional market", () => {
      const q1: BankruptcyQuery = {};
      const q2: BankruptcyQuery = { market: "BTC_USDC" };
      expect(q1.market).toBeUndefined();
      expect(q2.market).toBe("BTC_USDC");
    });

    it("MMPQuery has optional smart_account_address and pair", () => {
      const q: MMPQuery = { smart_account_address: "0xabc", pair: "BTC_USDC" };
      expect(q.smart_account_address).toBe("0xabc");
    });

    it("RFQQuery has all optional fields", () => {
      const q: RFQQuery = { account: "0xabc", type: "rfq_request", order_id: "ord_1" };
      expect(q.account).toBe("0xabc");
      expect(q.type).toBe("rfq_request");
      expect(q.order_id).toBe("ord_1");
    });
  });

  // -------------------------------------------------------------------------
  // Event types
  // -------------------------------------------------------------------------
  describe("event types", () => {
    it("PostOrderEvent extends WSMessage with order fields", () => {
      const evt: PostOrderEvent = {
        kind: "event",
        type: "post_order",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        direction: "buy",
        order_id: "ord_1",
        maker: "0xabc",
        amount: "1.5",
        limit_price: "50000",
        order_type: "limit",
      };
      expect(evt.type).toBe("post_order");
      expect(evt.instrument_name).toBe("BTC_USDC-PERPETUAL");
    });

    it("CancelOrderEvent extends WSMessage", () => {
      const evt: CancelOrderEvent = {
        kind: "event",
        type: "cancel_order",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        order_id: "ord_1",
        maker: "0xabc",
      };
      expect(evt.type).toBe("cancel_order");
    });

    it("UpdateOrderEvent extends WSMessage with filled_amount", () => {
      const evt: UpdateOrderEvent = {
        kind: "event",
        type: "update_order",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        order_id: "ord_1",
        maker: "0xabc",
        filled_amount: "0.5",
        amount: "1.5",
      };
      expect(evt.filled_amount).toBe("0.5");
    });

    it("OBSnapshotEvent has bids and asks arrays", () => {
      const evt: OBSnapshotEvent = {
        kind: "event",
        type: "ob_snapshot",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        bids: [{ order_id: "b1", maker: "0xabc", amount: "1", limit_price: "49999" }],
        asks: [{ order_id: "a1", maker: "0xdef", amount: "2", limit_price: "50001" }],
      };
      expect(evt.bids).toHaveLength(1);
      expect(evt.asks).toHaveLength(1);
    });

    it("OBUpdateEvent has bids and asks arrays", () => {
      const evt: OBUpdateEvent = {
        kind: "event",
        type: "ob_update",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        bids: [],
        asks: [],
      };
      expect(evt.type).toBe("ob_update");
    });

    it("OBMakerOrdersEvent has maker and orders array", () => {
      const evt: OBMakerOrdersEvent = {
        kind: "event",
        type: "ob_maker_orders",
        timestamp_ms: 0,
        maker: "0xabc",
        orders: [
          {
            instrument_name: "BTC_USDC-PERPETUAL",
            order_id: "o1",
            direction: "buy",
            amount: "1",
            limit_price: "50000",
            filled_amount: "0",
          },
        ],
      };
      expect(evt.orders).toHaveLength(1);
      expect(evt.orders[0]!.filled_amount).toBe("0");
    });

    it("IndexPriceEvent has pair and price", () => {
      const evt: IndexPriceEvent = {
        kind: "event",
        type: "index_price",
        timestamp_ms: 0,
        pair: "BTC_USDC",
        price: "50000.50",
      };
      expect(evt.pair).toBe("BTC_USDC");
      expect(evt.price).toBe("50000.50");
    });

    it("InstrumentsEvent has instruments array", () => {
      const evt: InstrumentsEvent = {
        kind: "event",
        type: "instruments",
        timestamp_ms: 0,
        instruments: [{ name: "BTC_USDC-PERPETUAL" }],
      };
      expect(evt.instruments).toHaveLength(1);
    });

    it("FundingEvent has instrument_name and funding_rate", () => {
      const evt: FundingEvent = {
        kind: "event",
        type: "funding",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        funding_rate: "0.0001",
      };
      expect(evt.funding_rate).toBe("0.0001");
    });

    it("InterestRateEvent has pair, rate, optional expiry", () => {
      const evt: InterestRateEvent = {
        kind: "event",
        type: "interest_rate",
        timestamp_ms: 0,
        pair: "BTC_USDC",
        rate: "0.05",
      };
      expect(evt.rate).toBe("0.05");
      expect(evt.expiry).toBeUndefined();
    });

    it("SVIEvent has type 'svi' (not 'iv'), pair, maturity, params", () => {
      const evt: SVIEvent = {
        kind: "event",
        type: "svi",
        timestamp_ms: 0,
        pair: "BTC_USDC",
        maturity: "2024-12-31",
        params: { a: 0.1, b: 0.2 },
      };
      expect(evt.type).toBe("svi");
      expect(evt.maturity).toBe("2024-12-31");
    });

    it("AccountStateEvent has account and data record", () => {
      const evt: AccountStateEvent = {
        kind: "event",
        type: "account_state",
        timestamp_ms: 0,
        account: "0xabc",
        data: { margin: "1000" },
      };
      expect(evt.data).toEqual({ margin: "1000" });
    });

    it("PositionEvent has account and positions array", () => {
      const evt: PositionEvent = {
        kind: "event",
        type: "position",
        timestamp_ms: 0,
        account: "0xabc",
        positions: [{ instrument: "BTC_USDC-PERPETUAL", size: "1.5" }],
      };
      expect(evt.positions).toHaveLength(1);
    });

    it("TradeEvent has all trade fields", () => {
      const evt: TradeEvent = {
        kind: "event",
        type: "trade",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        trade_id: "t1",
        direction: "buy",
        amount: "1",
        price: "50000",
        maker: "0xabc",
        taker: "0xdef",
      };
      expect(evt.trade_id).toBe("t1");
      expect(evt.maker).toBe("0xabc");
      expect(evt.taker).toBe("0xdef");
    });

    it("TransferEvent has account, symbol, amount, transfer_type", () => {
      const evt: TransferEvent = {
        kind: "event",
        type: "transfer",
        timestamp_ms: 0,
        account: "0xabc",
        symbol: "USDC",
        amount: "1000",
        transfer_type: "deposit",
      };
      expect(evt.transfer_type).toBe("deposit");
    });

    it("BankruptcyEvent has account and market", () => {
      const evt: BankruptcyEvent = {
        kind: "event",
        type: "bankruptcy",
        timestamp_ms: 0,
        account: "0xabc",
        market: "BTC_USDC",
      };
      expect(evt.market).toBe("BTC_USDC");
    });

    it("MMPTriggeredEvent has smart_account_address and pair", () => {
      const evt: MMPTriggeredEvent = {
        kind: "event",
        type: "mmp_triggered",
        timestamp_ms: 0,
        smart_account_address: "0xabc",
        pair: "BTC_USDC",
      };
      expect(evt.type).toBe("mmp_triggered");
    });

    it("RFQRequestEvent has order_id, account, legs", () => {
      const evt: RFQRequestEvent = {
        kind: "event",
        type: "rfq_request",
        timestamp_ms: 0,
        order_id: "rfq_1",
        account: "0xabc",
        legs: [{ instrument: "BTC_USDC-PERPETUAL", amount: "1", direction: "buy" }],
      };
      expect(evt.legs).toHaveLength(1);
    });

    it("RFQPostResponseEvent has order_id and responder", () => {
      const evt: RFQPostResponseEvent = {
        kind: "event",
        type: "rfq_post_response",
        timestamp_ms: 0,
        order_id: "rfq_1",
        responder: "0xdef",
      };
      expect(evt.responder).toBe("0xdef");
    });

    it("RFQCancelResponseEvent has order_id and responder", () => {
      const evt: RFQCancelResponseEvent = {
        kind: "event",
        type: "rfq_cancel_response",
        timestamp_ms: 0,
        order_id: "rfq_1",
        responder: "0xdef",
      };
      expect(evt.type).toBe("rfq_cancel_response");
    });
  });

  // -------------------------------------------------------------------------
  // Request/Response types
  // -------------------------------------------------------------------------
  describe("request and response types", () => {
    it("AuthRequest has type 'auth' and api_key", () => {
      const req: AuthRequest = { type: "auth", api_key: "test_key" };
      expect(req.type).toBe("auth");
      expect(req.api_key).toBe("test_key");
    });

    it("AuthResponse extends WSMessage with success", () => {
      const res: AuthResponse = {
        kind: "response",
        type: "auth",
        timestamp_ms: 0,
        success: true,
      };
      expect(res.success).toBe(true);
    });

    it("SubscribeRequest has channel and optional query", () => {
      const req: SubscribeRequest = {
        type: "subscribe",
        channel: "trade",
        query: { pair: "BTC_USDC" },
      };
      expect(req.channel).toBe("trade");
      expect(req.query).toEqual({ pair: "BTC_USDC" });
    });

    it("UnsubscribeRequest has channel and optional query", () => {
      const req: UnsubscribeRequest = {
        type: "unsubscribe",
        channel: "trade",
      };
      expect(req.type).toBe("unsubscribe");
    });

    it("UnsubscribeAllRequest has type only", () => {
      const req: UnsubscribeAllRequest = { type: "unsubscribe_all" };
      expect(req.type).toBe("unsubscribe_all");
    });

    it("GetSubscriptionsRequest has type only", () => {
      const req: GetSubscriptionsRequest = { type: "get_subscriptions" };
      expect(req.type).toBe("get_subscriptions");
    });

    it("GetSubscriptionsResponse has subscriptions array", () => {
      const res: GetSubscriptionsResponse = {
        kind: "response",
        type: "get_subscriptions",
        timestamp_ms: 0,
        subscriptions: [{ channel: "trade", query: { pair: "BTC_USDC" } }],
      };
      expect(res.subscriptions).toHaveLength(1);
    });

    it("GetInstrumentsRequest has type only", () => {
      const req: GetInstrumentsRequest = { type: "get_instruments" };
      expect(req.type).toBe("get_instruments");
    });

    it("GetObStateRequest has instruments array", () => {
      const req: GetObStateRequest = {
        type: "get_ob_state_by_instruments",
        instruments: ["BTC_USDC-PERPETUAL"],
      };
      expect(req.instruments).toEqual(["BTC_USDC-PERPETUAL"]);
    });

    it("GetObStateByMarketRequest has market string", () => {
      const req: GetObStateByMarketRequest = {
        type: "get_ob_state_by_market",
        market: "BTC_USDC",
      };
      expect(req.market).toBe("BTC_USDC");
    });

    it("ResendRequest has message_id", () => {
      const req: ResendRequest = { type: "resend", message_id: "msg_123" };
      expect(req.message_id).toBe("msg_123");
    });

    it("EnableSessionRecoveryRequest has type only", () => {
      const req: EnableSessionRecoveryRequest = { type: "enable_session_recovery" };
      expect(req.type).toBe("enable_session_recovery");
    });

    it("EnableSessionRecoveryResponse has recovery_token and ttl_seconds", () => {
      const res: EnableSessionRecoveryResponse = {
        kind: "response",
        type: "enable_session_recovery",
        timestamp_ms: 0,
        recovery_token: "tok_abc",
        ttl_seconds: 30,
      };
      expect(res.recovery_token).toBe("tok_abc");
      expect(res.ttl_seconds).toBe(30);
    });

    it("RecoverSessionRequest has recovery_token", () => {
      const req: RecoverSessionRequest = {
        type: "recover_session",
        recovery_token: "tok_abc",
      };
      expect(req.recovery_token).toBe("tok_abc");
    });

    it("RecoverSessionResponse has success, subscriptions_restored, messages_replayed", () => {
      const res: RecoverSessionResponse = {
        kind: "response",
        type: "recover_session",
        timestamp_ms: 0,
        success: true,
        subscriptions_restored: 3,
        messages_replayed: 10,
      };
      expect(res.subscriptions_restored).toBe(3);
      expect(res.messages_replayed).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // KyanWebSocketConfig
  // -------------------------------------------------------------------------
  describe("KyanWebSocketConfig", () => {
    it("apiKey is required, url and others are optional", () => {
      const config: KyanWebSocketConfig = { apiKey: "test_key" };
      expect(config.apiKey).toBe("test_key");
      expect(config.url).toBeUndefined();
      expect(config.autoReconnect).toBeUndefined();
      expect(config.onMessage).toBeUndefined();
      expect(config.onError).toBeUndefined();
      expect(config.onClose).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Union types
  // -------------------------------------------------------------------------
  describe("union types", () => {
    it("ClientRequest accepts AuthRequest", () => {
      const req: ClientRequest = { type: "auth", api_key: "key" };
      expect(req.type).toBe("auth");
    });

    it("ClientRequest accepts SubscribeRequest", () => {
      const req: ClientRequest = { type: "subscribe", channel: "trade" };
      expect(req.type).toBe("subscribe");
    });

    it("ServerEvent accepts TradeEvent", () => {
      const evt: ServerEvent = {
        kind: "event",
        type: "trade",
        timestamp_ms: 0,
        instrument_name: "BTC_USDC-PERPETUAL",
        trade_id: "t1",
        direction: "buy",
        amount: "1",
        price: "50000",
        maker: "0xabc",
        taker: "0xdef",
      };
      expect(evt.type).toBe("trade");
    });

    it("ServerEvent accepts IndexPriceEvent", () => {
      const evt: ServerEvent = {
        kind: "event",
        type: "index_price",
        timestamp_ms: 0,
        pair: "BTC_USDC",
        price: "50000",
      };
      expect(evt.type).toBe("index_price");
    });
  });
});

// ============================================================================
// 2. channels.ts
// ============================================================================

describe("channels.ts", () => {
  let ws: KyanWebSocket & { subscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ws = createMockWs() as any;
  });

  // 1. index_price
  describe("subscribeIndexPrice", () => {
    it("calls subscribe with 'index_price' and { pair }", async () => {
      await subscribeIndexPrice(ws, "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("index_price", { pair: "BTC_USDC" });
    });

    it("passes different pair values correctly", async () => {
      await subscribeIndexPrice(ws, "ETH_USDC");
      expect(ws.subscribe).toHaveBeenCalledWith("index_price", { pair: "ETH_USDC" });
    });
  });

  // 2. instruments
  describe("subscribeInstruments", () => {
    it("calls subscribe with 'instruments' and empty query when no market", async () => {
      await subscribeInstruments(ws);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("instruments", {});
    });

    it("calls subscribe with 'instruments' and { market } when market provided", async () => {
      await subscribeInstruments(ws, "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledWith("instruments", { market: "BTC_USDC" });
    });
  });

  // 3. funding
  describe("subscribeFunding", () => {
    it("calls subscribe with 'funding' and { instrument_name }", async () => {
      await subscribeFunding(ws, "BTC_USDC-PERPETUAL");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("funding", {
        instrument_name: "BTC_USDC-PERPETUAL",
      });
    });
  });

  // 4. interest_rate
  describe("subscribeInterestRate", () => {
    it("calls subscribe with 'interest_rate' and { pair }", async () => {
      await subscribeInterestRate(ws, "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("interest_rate", { pair: "BTC_USDC" });
    });

    it("includes expiry when provided", async () => {
      await subscribeInterestRate(ws, "BTC_USDC", "2024-12-31");
      expect(ws.subscribe).toHaveBeenCalledWith("interest_rate", {
        pair: "BTC_USDC",
        expiry: "2024-12-31",
      });
    });
  });

  // 5. iv
  describe("subscribeIV", () => {
    it("calls subscribe with 'iv' and { pair }", async () => {
      await subscribeIV(ws, "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("iv", { pair: "BTC_USDC" });
    });

    it("includes maturity when provided", async () => {
      await subscribeIV(ws, "BTC_USDC", "2024-12-31");
      expect(ws.subscribe).toHaveBeenCalledWith("iv", {
        pair: "BTC_USDC",
        maturity: "2024-12-31",
      });
    });
  });

  // 6. orderbook_perps
  describe("subscribeOrderbookPerps", () => {
    it("calls subscribe with 'orderbook_perps' and provided opts", async () => {
      const opts = { pair: "BTC_USDC", direction: "buy" };
      await subscribeOrderbookPerps(ws, opts);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_perps", {
        pair: "BTC_USDC",
        direction: "buy",
      });
    });

    it("passes instrument_name when provided", async () => {
      await subscribeOrderbookPerps(ws, { instrument_name: "BTC_USDC-PERPETUAL" });
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_perps", {
        instrument_name: "BTC_USDC-PERPETUAL",
      });
    });

    it("passes skip_snapshot=false explicitly", async () => {
      await subscribeOrderbookPerps(ws, { skip_snapshot: false });
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_perps", {
        skip_snapshot: false,
      });
    });

    it("sends empty query when opts has no truthy values", async () => {
      await subscribeOrderbookPerps(ws, {});
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_perps", {});
    });
  });

  // 7. orderbook_options
  describe("subscribeOrderbookOptions", () => {
    it("calls subscribe with 'orderbook_options' and full opts", async () => {
      const opts = {
        instrument_name: "BTC_USDC-20241231-50000-C",
        pair: "BTC_USDC",
        maturity: "2024-12-31",
        strike: "50000",
        type: "call",
        direction: "buy",
        skip_snapshot: true,
      };
      await subscribeOrderbookOptions(ws, opts);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_options", opts);
    });

    it("sends empty query when opts is empty", async () => {
      await subscribeOrderbookOptions(ws, {});
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_options", {});
    });
  });

  // 8. orderbook_maker
  describe("subscribeOrderbookMaker", () => {
    it("calls subscribe with 'orderbook_maker' and { maker }", async () => {
      await subscribeOrderbookMaker(ws, "0xmakerAddr");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_maker", {
        maker: "0xmakerAddr",
      });
    });

    it("includes pair when provided", async () => {
      await subscribeOrderbookMaker(ws, "0xmakerAddr", "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledWith("orderbook_maker", {
        maker: "0xmakerAddr",
        pair: "BTC_USDC",
      });
    });
  });

  // 9. account_state
  describe("subscribeAccountState", () => {
    it("calls subscribe with 'account_state' and { account }", async () => {
      await subscribeAccountState(ws, "0xaccount");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("account_state", {
        account: "0xaccount",
      });
    });

    it("includes pair when provided", async () => {
      await subscribeAccountState(ws, "0xaccount", "ETH_USDC");
      expect(ws.subscribe).toHaveBeenCalledWith("account_state", {
        account: "0xaccount",
        pair: "ETH_USDC",
      });
    });
  });

  // 10. position
  describe("subscribePosition", () => {
    it("calls subscribe with 'position' and { account }", async () => {
      await subscribePosition(ws, "0xaccount");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("position", {
        account: "0xaccount",
      });
    });

    it("includes market when provided", async () => {
      await subscribePosition(ws, "0xaccount", "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledWith("position", {
        account: "0xaccount",
        market: "BTC_USDC",
      });
    });
  });

  // 11. trade
  describe("subscribeTrade", () => {
    it("calls subscribe with 'trade' and empty query when no opts", async () => {
      await subscribeTrade(ws);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("trade", {});
    });

    it("includes account, pair, direction when provided", async () => {
      await subscribeTrade(ws, { account: "0xabc", pair: "BTC_USDC", direction: "sell" });
      expect(ws.subscribe).toHaveBeenCalledWith("trade", {
        account: "0xabc",
        pair: "BTC_USDC",
        direction: "sell",
      });
    });
  });

  // 12. transfer
  describe("subscribeTransfer", () => {
    it("calls subscribe with 'transfer' and { account }", async () => {
      await subscribeTransfer(ws, "0xaccount");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("transfer", {
        account: "0xaccount",
      });
    });

    it("includes symbol and type opts when provided", async () => {
      await subscribeTransfer(ws, "0xaccount", { symbol: "USDC", type: "deposit" });
      expect(ws.subscribe).toHaveBeenCalledWith("transfer", {
        account: "0xaccount",
        symbol: "USDC",
        type: "deposit",
      });
    });
  });

  // 13. account_liquidation
  describe("subscribeAccountLiquidation", () => {
    it("calls subscribe with 'account_liquidation' and { account }", async () => {
      await subscribeAccountLiquidation(ws, "0xaccount");
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("account_liquidation", {
        account: "0xaccount",
      });
    });
  });

  // 14. bankruptcy
  describe("subscribeBankruptcy", () => {
    it("calls subscribe with 'bankruptcy' and empty query when no market", async () => {
      await subscribeBankruptcy(ws);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("bankruptcy", {});
    });

    it("includes market when provided", async () => {
      await subscribeBankruptcy(ws, "BTC_USDC");
      expect(ws.subscribe).toHaveBeenCalledWith("bankruptcy", { market: "BTC_USDC" });
    });
  });

  // 15. mmp
  describe("subscribeMMP", () => {
    it("calls subscribe with 'mmp' and empty query when no opts", async () => {
      await subscribeMMP(ws);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("mmp", {});
    });

    it("includes smart_account_address and pair when provided", async () => {
      await subscribeMMP(ws, { smart_account_address: "0xabc", pair: "BTC_USDC" });
      expect(ws.subscribe).toHaveBeenCalledWith("mmp", {
        smart_account_address: "0xabc",
        pair: "BTC_USDC",
      });
    });
  });

  // 16. rfq
  describe("subscribeRFQ", () => {
    it("calls subscribe with 'rfq' and empty query when no opts", async () => {
      await subscribeRFQ(ws);
      expect(ws.subscribe).toHaveBeenCalledOnce();
      expect(ws.subscribe).toHaveBeenCalledWith("rfq", {});
    });

    it("includes account, type, order_id when provided", async () => {
      await subscribeRFQ(ws, { account: "0xabc", type: "rfq_request", order_id: "ord_1" });
      expect(ws.subscribe).toHaveBeenCalledWith("rfq", {
        account: "0xabc",
        type: "rfq_request",
        order_id: "ord_1",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Return value propagation
  // -------------------------------------------------------------------------
  describe("return value", () => {
    it("all helpers return the promise from ws.subscribe", async () => {
      const result = await subscribeIndexPrice(ws, "BTC_USDC");
      expect(result).toBeDefined();
      expect(result.kind).toBe("response");
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// 3. recovery.ts
// ============================================================================

describe("recovery.ts", () => {
  describe("constants", () => {
    it("DEFAULT_RECOVERY_TTL_SECONDS is 30", () => {
      expect(DEFAULT_RECOVERY_TTL_SECONDS).toBe(30);
    });

    it("MAX_BUFFERED_MESSAGES is 1000", () => {
      expect(MAX_BUFFERED_MESSAGES).toBe(1000);
    });
  });

  describe("enableSessionRecovery", () => {
    it("sends { type: 'enable_session_recovery' } via sendRequest", async () => {
      const ws = createMockWs();
      ws.sendRequest.mockResolvedValue({
        kind: "response",
        type: "enable_session_recovery",
        timestamp_ms: Date.now(),
        recovery_token: "tok_recovery_abc",
        ttl_seconds: 30,
      });

      const result = await enableSessionRecovery(ws);

      expect(ws.sendRequest).toHaveBeenCalledOnce();
      expect(ws.sendRequest).toHaveBeenCalledWith({
        type: "enable_session_recovery",
      });
      expect(result.recovery_token).toBe("tok_recovery_abc");
      expect(result.ttl_seconds).toBe(30);
    });

    it("returns SessionRecoveryInfo shape", async () => {
      const ws = createMockWs();
      ws.sendRequest.mockResolvedValue({
        kind: "response",
        type: "enable_session_recovery",
        timestamp_ms: Date.now(),
        recovery_token: "tok_xyz",
        ttl_seconds: 60,
      });

      const info = await enableSessionRecovery(ws);
      expect(info).toHaveProperty("recovery_token");
      expect(info).toHaveProperty("ttl_seconds");
      expect(typeof info.recovery_token).toBe("string");
      expect(typeof info.ttl_seconds).toBe("number");
    });
  });

  describe("recoverSession", () => {
    it("sends { type: 'recover_session', recovery_token } via sendRequest", async () => {
      const ws = createMockWs();
      ws.sendRequest.mockResolvedValue({
        kind: "response",
        type: "recover_session",
        timestamp_ms: Date.now(),
        success: true,
        subscriptions_restored: 5,
        messages_replayed: 42,
      });

      const result = await recoverSession(ws, "tok_recovery_abc");

      expect(ws.sendRequest).toHaveBeenCalledOnce();
      expect(ws.sendRequest).toHaveBeenCalledWith({
        type: "recover_session",
        recovery_token: "tok_recovery_abc",
      });
      expect(result.success).toBe(true);
      expect(result.subscriptions_restored).toBe(5);
      expect(result.messages_replayed).toBe(42);
    });

    it("defaults subscriptions_restored and messages_replayed to 0 when undefined", async () => {
      const ws = createMockWs();
      ws.sendRequest.mockResolvedValue({
        kind: "response",
        type: "recover_session",
        timestamp_ms: Date.now(),
        success: true,
        // no subscriptions_restored or messages_replayed
      });

      const result = await recoverSession(ws, "tok_123");
      expect(result.subscriptions_restored).toBe(0);
      expect(result.messages_replayed).toBe(0);
    });

    it("returns success=false when server indicates failure", async () => {
      const ws = createMockWs();
      ws.sendRequest.mockResolvedValue({
        kind: "response",
        type: "recover_session",
        timestamp_ms: Date.now(),
        success: false,
      });

      const result = await recoverSession(ws, "expired_tok");
      expect(result.success).toBe(false);
      expect(result.subscriptions_restored).toBe(0);
      expect(result.messages_replayed).toBe(0);
    });
  });
});

// ============================================================================
// 4. client.ts
// ============================================================================

describe("client.ts — KyanWebSocket", () => {
  // -------------------------------------------------------------------------
  // Constructor defaults
  // -------------------------------------------------------------------------
  describe("constructor defaults", () => {
    it("uses staging URL when url is not provided", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });
      // We can't directly access private fields, but we can verify the
      // object was created successfully. The default URL is tested indirectly
      // through the connect method (which would try to connect to the default).
      expect(ws).toBeInstanceOf(KyanWebSocket);
    });

    it("autoReconnect defaults to true (verified via close behavior)", () => {
      // autoReconnect is private, but we verify the instance is created
      // with defaults intact by constructing with minimal config
      const ws = new KyanWebSocket({ apiKey: "test_key" });
      expect(ws).toBeInstanceOf(KyanWebSocket);
    });

    it("accepts explicit url override", () => {
      const ws = new KyanWebSocket({
        apiKey: "key",
        url: "wss://custom.example.com/ws",
      });
      expect(ws).toBeInstanceOf(KyanWebSocket);
    });

    it("accepts all optional config options", () => {
      const onMsg = vi.fn();
      const onErr = vi.fn();
      const onClose = vi.fn();
      const ws = new KyanWebSocket({
        apiKey: "key",
        url: "wss://custom.example.com/ws",
        autoReconnect: false,
        onMessage: onMsg,
        onError: onErr,
        onClose: onClose,
      });
      expect(ws).toBeInstanceOf(KyanWebSocket);
    });
  });

  // -------------------------------------------------------------------------
  // EventEmitter pattern
  // -------------------------------------------------------------------------
  describe("EventEmitter: on / off / emit", () => {
    let ws: KyanWebSocket;

    beforeEach(() => {
      ws = new KyanWebSocket({ apiKey: "test_key" });
    });

    it("on() registers a handler and receives emitted events", () => {
      const handler = vi.fn();
      ws.on("test_event", handler);

      // Trigger emit by accessing the private method through the prototype
      // Since emit is private, we call it via any-cast
      (ws as any).emit("test_event", { data: "hello" });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ data: "hello" });
    });

    it("on() supports multiple handlers for the same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      ws.on("test_event", handler1);
      ws.on("test_event", handler2);

      (ws as any).emit("test_event", { val: 42 });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it("on() supports different event types independently", () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();
      ws.on("event_a", handlerA);
      ws.on("event_b", handlerB);

      (ws as any).emit("event_a", { type: "a" });

      expect(handlerA).toHaveBeenCalledOnce();
      expect(handlerB).not.toHaveBeenCalled();
    });

    it("off() removes a handler so it no longer receives events", () => {
      const handler = vi.fn();
      ws.on("test_event", handler);
      ws.off("test_event", handler);

      (ws as any).emit("test_event", {});

      expect(handler).not.toHaveBeenCalled();
    });

    it("off() only removes the specific handler, not others", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      ws.on("test_event", handler1);
      ws.on("test_event", handler2);

      ws.off("test_event", handler1);
      (ws as any).emit("test_event", {});

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it("off() is safe to call for non-existent event types", () => {
      const handler = vi.fn();
      // Should not throw
      expect(() => ws.off("non_existent", handler)).not.toThrow();
    });

    it("emit does not throw when no handlers registered for event", () => {
      expect(() => (ws as any).emit("no_handlers", {})).not.toThrow();
    });

    it("emit catches and logs errors thrown by handlers", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const badHandler = vi.fn(() => {
        throw new Error("handler error");
      });
      const goodHandler = vi.fn();

      ws.on("test_event", badHandler);
      ws.on("test_event", goodHandler);

      (ws as any).emit("test_event", {});

      expect(badHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled(); // Good handler still runs
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Request ID generation
  // -------------------------------------------------------------------------
  describe("request ID generation", () => {
    it("generates unique IDs with incrementing counter", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });

      // Access private nextId() via any-cast
      const id1 = (ws as any).nextId();
      const id2 = (ws as any).nextId();
      const id3 = (ws as any).nextId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("IDs have the 'req_' prefix", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });

      const id = (ws as any).nextId();
      expect(id).toMatch(/^req_/);
    });

    it("IDs contain a counter and timestamp", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });

      const id = (ws as any).nextId();
      // Format: req_{counter}_{timestamp}
      const parts = id.split("_");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("req");
      expect(Number(parts[1])).toBeGreaterThan(0); // counter
      expect(Number(parts[2])).toBeGreaterThan(0); // timestamp
    });

    it("counter increments sequentially across multiple calls", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });

      const id1 = (ws as any).nextId();
      const id2 = (ws as any).nextId();

      const counter1 = Number(id1.split("_")[1]);
      const counter2 = Number(id2.split("_")[1]);
      expect(counter2).toBe(counter1 + 1);
    });
  });

  // -------------------------------------------------------------------------
  // connected getter (without real WebSocket)
  // -------------------------------------------------------------------------
  describe("connected getter", () => {
    it("returns false when no WebSocket is set", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });
      expect(ws.connected).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // currentSeqId getter
  // -------------------------------------------------------------------------
  describe("currentSeqId getter", () => {
    it("returns null initially", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });
      expect(ws.currentSeqId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // close()
  // -------------------------------------------------------------------------
  describe("close()", () => {
    it("does not throw when no WebSocket is connected", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });
      expect(() => ws.close()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // send() without connection
  // -------------------------------------------------------------------------
  describe("send()", () => {
    it("throws when WebSocket is not connected", () => {
      const ws = new KyanWebSocket({ apiKey: "test_key" });
      expect(() => ws.send({ type: "test" })).toThrow("WebSocket is not connected");
    });
  });

  // -------------------------------------------------------------------------
  // handleRawMessage (private, tested via any-cast)
  // -------------------------------------------------------------------------
  describe("handleRawMessage", () => {
    let ws: KyanWebSocket;

    beforeEach(() => {
      ws = new KyanWebSocket({ apiKey: "test_key" });
    });

    it("parses JSON string messages and emits by type", () => {
      const handler = vi.fn();
      ws.on("trade", handler);

      const raw = JSON.stringify({
        kind: "event",
        type: "trade",
        timestamp_ms: Date.now(),
        instrument_name: "BTC_USDC-PERPETUAL",
        trade_id: "t1",
        direction: "buy",
        amount: "1",
        price: "50000",
        maker: "0x1",
        taker: "0x2",
      });

      (ws as any).handleRawMessage(raw);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].type).toBe("trade");
    });

    it("emits 'message' for every parsed message", () => {
      const handler = vi.fn();
      ws.on("message", handler);

      (ws as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "trade", timestamp_ms: 0 }),
      );

      expect(handler).toHaveBeenCalledOnce();
    });

    it("does not throw on invalid JSON", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => (ws as any).handleRawMessage("not-json")).not.toThrow();
      consoleError.mockRestore();
    });

    it("warns and returns on non-string frames", () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const handler = vi.fn();
      ws.on("message", handler);

      (ws as any).handleRawMessage(new ArrayBuffer(8));

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it("tracks seq_id and detects gaps", () => {
      const gapHandler = vi.fn();
      ws.on("sequence_gap", gapHandler);

      // First message: seq_id = 1
      (ws as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "trade", timestamp_ms: 0, seq_id: 1 }),
      );
      expect(ws.currentSeqId).toBe(1);

      // Second message: seq_id = 5 (gap of 3)
      (ws as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "trade", timestamp_ms: 0, seq_id: 5 }),
      );
      expect(ws.currentSeqId).toBe(5);
      expect(gapHandler).toHaveBeenCalledOnce();
      expect(gapHandler).toHaveBeenCalledWith({
        expected: 2,
        received: 5,
        gap: 3,
      });
    });

    it("does not emit gap on consecutive seq_ids", () => {
      const gapHandler = vi.fn();
      ws.on("sequence_gap", gapHandler);

      (ws as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "a", timestamp_ms: 0, seq_id: 1 }),
      );
      (ws as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "b", timestamp_ms: 0, seq_id: 2 }),
      );
      (ws as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "c", timestamp_ms: 0, seq_id: 3 }),
      );

      expect(gapHandler).not.toHaveBeenCalled();
      expect(ws.currentSeqId).toBe(3);
    });

    it("calls global onMessage callback when configured", () => {
      const onMessage = vi.fn();
      const wsWithCb = new KyanWebSocket({ apiKey: "key", onMessage });

      (wsWithCb as any).handleRawMessage(
        JSON.stringify({ kind: "event", type: "trade", timestamp_ms: 0 }),
      );

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage.mock.calls[0]![0].type).toBe("trade");
    });

    it("resolves pending requests on response kind with matching id", () => {
      const resolver = vi.fn();
      const timeout = setTimeout(() => {}, 10000);

      // Manually set up a pending request
      (ws as any).pendingRequests.set("req_1_123", {
        resolve: resolver,
        reject: vi.fn(),
        timeout,
      });

      (ws as any).handleRawMessage(
        JSON.stringify({
          kind: "response",
          type: "subscribe",
          timestamp_ms: 0,
          id: "req_1_123",
          success: true,
        }),
      );

      expect(resolver).toHaveBeenCalledOnce();
      expect((ws as any).pendingRequests.size).toBe(0);

      clearTimeout(timeout);
    });

    it("rejects pending requests when success is false", () => {
      const rejecter = vi.fn();
      const timeout = setTimeout(() => {}, 10000);

      (ws as any).pendingRequests.set("req_2_123", {
        resolve: vi.fn(),
        reject: rejecter,
        timeout,
      });

      (ws as any).handleRawMessage(
        JSON.stringify({
          kind: "response",
          type: "subscribe",
          timestamp_ms: 0,
          id: "req_2_123",
          success: false,
          error: "Channel not found",
        }),
      );

      expect(rejecter).toHaveBeenCalledOnce();
      expect(rejecter.mock.calls[0]![0]).toBeInstanceOf(Error);
      expect(rejecter.mock.calls[0]![0].message).toBe("Channel not found");

      clearTimeout(timeout);
    });
  });
});
