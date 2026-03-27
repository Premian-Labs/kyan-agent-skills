import type { Address } from "viem";

// ── Trading Pairs ──────────────────────────────────────────────────────
export type TradingPair = "BTC_USDC" | "ETH_USDC" | "ARB_USDC";

// ── Directions ─────────────────────────────────────────────────────────
export type Direction = "buy" | "sell";
export const DIRECTION_MAP = { buy: 0, sell: 1 } as const;

// ── Instrument Types ───────────────────────────────────────────────────
export type OptionType = "C" | "P";
export type InstrumentType = "option" | "perpetual";

/**
 * Option instrument: BTC_USDC-31OCT25-106000-C
 * Perpetual instrument: BTC_USDC-PERPETUAL
 * ARB strikes use 'd' for decimal: 1d250 = 1.25, 0d500 = 0.5
 */
export type InstrumentName = string;

// ── Order Types ────────────────────────────────────────────────────────
export type OrderType = "good_til_cancelled";

export interface LimitOrderRequest {
  instrument_name: InstrumentName;
  type: OrderType;
  contracts?: number; // For options
  amount?: number; // For perpetuals (dollar-notional)
  direction: Direction;
  price: number;
  post_only: boolean;
  mmp: boolean;
  liquidation: boolean;
  maker: Address;
  taker: Address | null;
}

export interface MarketOrderRequest {
  market_order: {
    instrument_name: InstrumentName;
    contracts?: number;
    amount?: number;
    direction: Direction;
  };
  limit_price: number;
  taker: Address;
}

export interface ComboLeg {
  instrument_name: InstrumentName;
  contracts?: number;
  amount?: number;
  direction: Direction;
}

export interface ComboOrderRequest {
  market_orders: ComboLeg[];
  limit_net_premium: number;
  limit_perp_price: number;
  taker: Address;
}

// ── Cancel ─────────────────────────────────────────────────────────────
export interface CancelOrdersRequest {
  maker: Address;
  order_ids: string[];
}

export interface CancelOrdersResponse {
  orders_cancelled: string[];
  orders_pending_cancel: string[];
  rejected_cancellations: string[];
  orders_not_found: string[];
}

// ── Account ────────────────────────────────────────────────────────────
export interface PortfolioGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

export interface Position {
  instrument_type: InstrumentType;
  instrument: InstrumentName;
  size: number;
  average_price: number;
  entry_fees: number;
  mark_price: number;
  mark_iv: number;
  mark_interest: number;
  position_greeks: PortfolioGreeks;
}

export interface MarginAccount {
  pair: TradingPair;
  timestamp: number;
  margin_account: number;
  im: number;
  mm: number;
  matrix_risk: number;
  delta_risk: number;
  roll_risk: number;
  unrealised_pnl: number;
  equity: number;
  portfolio_greeks: PortfolioGreeks;
  positions: Position[];
}

export interface AccountState {
  margin_accounts: MarginAccount[];
}

// ── RFQ ────────────────────────────────────────────────────────────────
export interface RFQRequest {
  legs: ComboLeg[];
}

export interface RFQResponse {
  response_id: string;
  legs: ComboLeg[];
  prices: number[];
}

// ── Collateral ─────────────────────────────────────────────────────────
export interface DepositRequest {
  amount: number;
  pair: TradingPair;
}

export interface WithdrawRequest {
  amount: number;
  pair: TradingPair;
}

export interface TransferRequest {
  amount: number;
  from_pair: TradingPair;
  to_pair: TradingPair;
}

// ── Risk ───────────────────────────────────────────────────────────────
export interface RiskMetrics {
  im: number;
  mm: number;
  matrix_risk: number;
  delta_risk: number;
  roll_risk: number;
}

export interface SettlementProjection extends RiskMetrics {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

// ── Fees ───────────────────────────────────────────────────────────────
export interface FeeSchedule {
  maker: number;
  taker: number;
  liquidation: number;
}

// ── WebSocket ──────────────────────────────────────────────────────────
export type WSChannelName =
  | "index_price"
  | "instruments"
  | "funding"
  | "interest_rate"
  | "iv"
  | "orderbook_perps"
  | "orderbook_options"
  | "orderbook_maker"
  | "account_state"
  | "position"
  | "trade"
  | "transfer"
  | "account_liquidation"
  | "bankruptcy"
  | "mmp"
  | "rfq";

export type WSMessageKind = "response" | "event";

export interface WSServerMessage {
  kind: WSMessageKind;
  type: string;
  timestamp_ms: number;
  message_id?: string;
  seq_id?: number;
}

export type OrderbookEvent =
  | "post_order"
  | "cancel_order"
  | "update_order"
  | "ob_snapshot"
  | "ob_update"
  | "ob_maker_orders";

// ── MMP ────────────────────────────────────────────────────────────────
export interface MMPConfig {
  smart_account_address: Address;
  pair_symbol: TradingPair;
  status: "active" | "frozen";
  interval: number;
  frozen_time: number;
  quantity_limit?: number;
  delta_limit?: number;
  vega_limit?: number;
}
