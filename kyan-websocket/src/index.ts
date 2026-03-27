// ============================================================================
// @kyan-skills/websocket
// WebSocket streaming client for Kyan derivatives exchange
// ============================================================================

export { KyanWebSocket } from "./client.js";

export {
  enableSessionRecovery,
  recoverSession,
  DEFAULT_RECOVERY_TTL_SECONDS,
  MAX_BUFFERED_MESSAGES,
} from "./recovery.js";

export type { SessionRecoveryInfo, SessionRecoveryResult } from "./recovery.js";

export {
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
} from "./channels.js";

export type {
  OrderbookPerpsOpts,
  OrderbookOptionsOpts,
  TradeOpts,
  TransferOpts,
  MMPOpts,
  RFQOpts,
} from "./channels.js";

export type {
  // Config
  KyanWebSocketConfig,

  // Message envelope
  WSMessage,

  // Client requests
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

  // Channel query types
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

  // Channel event types
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

  // Union types
  ClientRequest,
  ServerEvent,
} from "./types.js";
