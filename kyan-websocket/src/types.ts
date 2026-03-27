// ============================================================================
// Kyan WebSocket Types
// All message types, request/response envelopes, and channel event types
// ============================================================================

// ---------------------------------------------------------------------------
// Server message envelope
// ---------------------------------------------------------------------------

export interface WSMessage {
  /** "response" for request replies, "event" for subscription pushes */
  kind: "response" | "event";
  /** Message type identifier */
  type: string;
  /** Server timestamp in milliseconds */
  timestamp_ms: number;
  /** Unique message ID (for resend requests) */
  message_id?: string;
  /** Monotonically increasing sequence number for gap detection */
  seq_id?: number;
  /** Correlation ID echoed back from the client request */
  id?: string;
  /** Whether the request succeeded (present on kind: "response") */
  success?: boolean;
  /** Error description (present when success is false) */
  error?: string;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface AuthRequest {
  type: "auth";
  api_key: string;
  id?: string;
}

export interface AuthResponse extends WSMessage {
  type: "auth";
  success: boolean;
}

// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------

export interface SubscribeRequest {
  type: "subscribe";
  channel: string;
  query?: Record<string, unknown>;
  id?: string;
}

export interface UnsubscribeRequest {
  type: "unsubscribe";
  channel: string;
  query?: Record<string, unknown>;
  id?: string;
}

export interface UnsubscribeAllRequest {
  type: "unsubscribe_all";
  id?: string;
}

export interface GetSubscriptionsRequest {
  type: "get_subscriptions";
  id?: string;
}

export interface GetSubscriptionsResponse extends WSMessage {
  type: "get_subscriptions";
  subscriptions: Array<{ channel: string; query?: Record<string, unknown> }>;
}

// ---------------------------------------------------------------------------
// Instrument queries
// ---------------------------------------------------------------------------

export interface GetInstrumentsRequest {
  type: "get_instruments";
  id?: string;
}

export interface GetObStateRequest {
  type: "get_ob_state_by_instruments";
  instruments: string[];
  id?: string;
}

export interface GetObStateByMarketRequest {
  type: "get_ob_state_by_market";
  market: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Message re-delivery
// ---------------------------------------------------------------------------

export interface ResendRequest {
  type: "resend";
  message_id: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Channel subscription query types
// ---------------------------------------------------------------------------

/** index_price channel: { pair: string } */
export interface IndexPriceQuery {
  pair: string;
}

/** instruments channel: { market?: string } */
export interface InstrumentsQuery {
  market?: string;
}

/** funding channel: { instrument_name: string } */
export interface FundingQuery {
  instrument_name: string;
}

/** interest_rate channel: { pair: string, expiry?: string } */
export interface InterestRateQuery {
  pair: string;
  expiry?: string;
}

/** iv channel: { pair: string, maturity?: string } — NOTE: event type is "svi", not "iv" */
export interface IVQuery {
  pair: string;
  maturity?: string;
}

/** orderbook_perps channel */
export interface OrderbookPerpsQuery {
  instrument_name?: string;
  pair?: string;
  direction?: string;
  skip_snapshot?: boolean;
}

/** orderbook_options channel */
export interface OrderbookOptionsQuery {
  instrument_name?: string;
  pair?: string;
  maturity?: string;
  strike?: string;
  type?: string;
  direction?: string;
  skip_snapshot?: boolean;
}

/** orderbook_maker channel: { maker: string, pair?: string } */
export interface OrderbookMakerQuery {
  maker: string;
  pair?: string;
}

/** account_state channel: { account: string, pair?: string } */
export interface AccountStateQuery {
  account: string;
  pair?: string;
}

/** position channel: { account: string, market?: string } — polled every second */
export interface PositionQuery {
  account: string;
  market?: string;
}

/** trade channel: all fields optional */
export interface TradeQuery {
  account?: string;
  pair?: string;
  direction?: string;
}

/** transfer channel: { account: string, symbol?: string, type?: string } */
export interface TransferQuery {
  account: string;
  symbol?: string;
  type?: string;
}

/** account_liquidation channel: { account: string } — NOT YET DELIVERING EVENTS */
export interface AccountLiquidationQuery {
  account: string;
}

/** bankruptcy channel: { market?: string } */
export interface BankruptcyQuery {
  market?: string;
}

/** mmp channel: { smart_account_address?: string, pair?: string } — event type: mmp_triggered */
export interface MMPQuery {
  smart_account_address?: string;
  pair?: string;
}

/** rfq channel — events: rfq_request, rfq_post_response, rfq_cancel_response */
export interface RFQQuery {
  account?: string;
  type?: string;
  order_id?: string;
}

// ---------------------------------------------------------------------------
// Channel event types
// ---------------------------------------------------------------------------

/** Orderbook: new order posted */
export interface PostOrderEvent extends WSMessage {
  type: "post_order";
  instrument_name: string;
  direction: string;
  order_id: string;
  maker: string;
  amount: string;
  limit_price: string;
  order_type: string;
}

/** Orderbook: order cancelled */
export interface CancelOrderEvent extends WSMessage {
  type: "cancel_order";
  instrument_name: string;
  order_id: string;
  maker: string;
}

/** Orderbook: order updated (partial fill) */
export interface UpdateOrderEvent extends WSMessage {
  type: "update_order";
  instrument_name: string;
  order_id: string;
  maker: string;
  filled_amount: string;
  amount: string;
}

/** Orderbook: full book snapshot */
export interface OBSnapshotEvent extends WSMessage {
  type: "ob_snapshot";
  instrument_name: string;
  bids: Array<{ order_id: string; maker: string; amount: string; limit_price: string }>;
  asks: Array<{ order_id: string; maker: string; amount: string; limit_price: string }>;
}

/** Orderbook: incremental update */
export interface OBUpdateEvent extends WSMessage {
  type: "ob_update";
  instrument_name: string;
  bids: Array<{ order_id: string; maker: string; amount: string; limit_price: string }>;
  asks: Array<{ order_id: string; maker: string; amount: string; limit_price: string }>;
}

/** Orderbook: maker's orders snapshot */
export interface OBMakerOrdersEvent extends WSMessage {
  type: "ob_maker_orders";
  maker: string;
  orders: Array<{
    instrument_name: string;
    order_id: string;
    direction: string;
    amount: string;
    limit_price: string;
    filled_amount: string;
  }>;
}

/** Index price event */
export interface IndexPriceEvent extends WSMessage {
  type: "index_price";
  pair: string;
  price: string;
}

/** Instruments event */
export interface InstrumentsEvent extends WSMessage {
  type: "instruments";
  instruments: Array<Record<string, unknown>>;
}

/** Funding rate event */
export interface FundingEvent extends WSMessage {
  type: "funding";
  instrument_name: string;
  funding_rate: string;
}

/** Interest rate event */
export interface InterestRateEvent extends WSMessage {
  type: "interest_rate";
  pair: string;
  rate: string;
  expiry?: string;
}

/** IV event — note: server sends type "svi", not "iv" */
export interface SVIEvent extends WSMessage {
  type: "svi";
  pair: string;
  maturity: string;
  params: Record<string, unknown>;
}

/** Account state event */
export interface AccountStateEvent extends WSMessage {
  type: "account_state";
  account: string;
  pair?: string;
  data: Record<string, unknown>;
}

/** Position event — polled every second */
export interface PositionEvent extends WSMessage {
  type: "position";
  account: string;
  positions: Array<Record<string, unknown>>;
}

/** Trade event */
export interface TradeEvent extends WSMessage {
  type: "trade";
  instrument_name: string;
  trade_id: string;
  direction: string;
  amount: string;
  price: string;
  maker: string;
  taker: string;
}

/** Transfer event */
export interface TransferEvent extends WSMessage {
  type: "transfer";
  account: string;
  symbol: string;
  amount: string;
  transfer_type: string;
}

/** Bankruptcy event */
export interface BankruptcyEvent extends WSMessage {
  type: "bankruptcy";
  account: string;
  market: string;
}

/** MMP triggered event */
export interface MMPTriggeredEvent extends WSMessage {
  type: "mmp_triggered";
  smart_account_address: string;
  pair: string;
}

/** RFQ request event */
export interface RFQRequestEvent extends WSMessage {
  type: "rfq_request";
  order_id: string;
  account: string;
  legs: Array<Record<string, unknown>>;
}

/** RFQ post response event */
export interface RFQPostResponseEvent extends WSMessage {
  type: "rfq_post_response";
  order_id: string;
  responder: string;
}

/** RFQ cancel response event */
export interface RFQCancelResponseEvent extends WSMessage {
  type: "rfq_cancel_response";
  order_id: string;
  responder: string;
}

// ---------------------------------------------------------------------------
// Session recovery
// ---------------------------------------------------------------------------

export interface EnableSessionRecoveryRequest {
  type: "enable_session_recovery";
  id?: string;
}

export interface EnableSessionRecoveryResponse extends WSMessage {
  type: "enable_session_recovery";
  recovery_token: string;
  ttl_seconds: number;
}

export interface RecoverSessionRequest {
  type: "recover_session";
  recovery_token: string;
  id?: string;
}

export interface RecoverSessionResponse extends WSMessage {
  type: "recover_session";
  success: boolean;
  subscriptions_restored?: number;
  messages_replayed?: number;
}

// ---------------------------------------------------------------------------
// Union types for convenience
// ---------------------------------------------------------------------------

export type ClientRequest =
  | AuthRequest
  | SubscribeRequest
  | UnsubscribeRequest
  | UnsubscribeAllRequest
  | GetSubscriptionsRequest
  | GetInstrumentsRequest
  | GetObStateRequest
  | GetObStateByMarketRequest
  | ResendRequest
  | EnableSessionRecoveryRequest
  | RecoverSessionRequest;

export type ServerEvent =
  | PostOrderEvent
  | CancelOrderEvent
  | UpdateOrderEvent
  | OBSnapshotEvent
  | OBUpdateEvent
  | OBMakerOrdersEvent
  | IndexPriceEvent
  | InstrumentsEvent
  | FundingEvent
  | InterestRateEvent
  | SVIEvent
  | AccountStateEvent
  | PositionEvent
  | TradeEvent
  | TransferEvent
  | BankruptcyEvent
  | MMPTriggeredEvent
  | RFQRequestEvent
  | RFQPostResponseEvent
  | RFQCancelResponseEvent;

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

export interface KyanWebSocketConfig {
  /** WebSocket endpoint URL. Default: wss://staging.kyan.sh/ws */
  url?: string;
  /** API key for authentication */
  apiKey: string;
  /** Global message handler */
  onMessage?: (message: WSMessage) => void;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Close handler */
  onClose?: (code: number, reason: string) => void;
  /** Enable auto-reconnect with exponential backoff. Default: true */
  autoReconnect?: boolean;
}
