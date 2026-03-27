/**
 * Account state, history, and positions for the Kyan derivatives exchange.
 *
 * These endpoints return the multi-account portfolio view, per-pair margin
 * accounts with full Greeks, and paginated event history.
 */

import type {
  TradingPair,
  InstrumentType,
  InstrumentName,
  PortfolioGreeks,
} from "../../shared/src/types.js";

// ---------------------------------------------------------------------------
// Client interface (generic — no import from kyan-trading)
// ---------------------------------------------------------------------------

type KyanClient = {
  get: (path: string, params?: Record<string, string>) => Promise<any>;
  post: (path: string, body?: unknown) => Promise<any>;
  delete: (path: string, body?: unknown) => Promise<any>;
};

// ---------------------------------------------------------------------------
// Types — Account State
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types — Account History (v2, Beta)
// ---------------------------------------------------------------------------

/** Event types returned by v2 account-history. */
export type AccountHistoryEventType =
  | "deposit"
  | "withdraw"
  | "transfer"
  | "trade"
  | "settlement"
  | "liquidation"
  | "funding"
  | "fee";

export type AccountHistoryAction =
  | "open"
  | "close"
  | "increase"
  | "decrease";

export type TransferType = "deposit" | "withdrawal" | "internal";

export type SortKey = "timestamp" | "id";
export type SortOrder = "asc" | "desc";

export interface AccountHistoryEvent {
  /** Unique identifier for this event. */
  id: string;
  /** Second-based Unix timestamp. */
  timestamp: number;
  /** High-level event category. */
  event_type: AccountHistoryEventType;
  /** Structured data specific to the event type. */
  data: Record<string, unknown>;
}

export interface AccountHistoryParams {
  /** Cursor for forward pagination (opaque string from previous response). */
  cursor?: string;
  /** Filter to specific event types. */
  event_types?: AccountHistoryEventType[];
  /** Filter by action (open/close/increase/decrease). */
  actions?: AccountHistoryAction[];
  /** Filter by trading pair / market. */
  markets?: TradingPair[];
  /** Filter by transfer type (deposit/withdrawal/internal). */
  transfer_type?: TransferType;
  /** Field to sort by. Defaults to "timestamp". */
  sortKey?: SortKey;
  /** Sort direction. Defaults to "desc". */
  sortOrder?: SortOrder;
}

export interface AccountHistoryResponse {
  /** Cursor to pass for the next page. Null when no more results. */
  next_cursor: string | null;
  /** Events matching the query. */
  events: AccountHistoryEvent[];
}

// ---------------------------------------------------------------------------
// Types — Positions
// ---------------------------------------------------------------------------

export interface PositionsResponse {
  margin_accounts: MarginAccount[];
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Fetch the full account state snapshot across all margin accounts.
 *
 * Returns per-pair margin accounts each containing:
 *  - margin metrics (im, mm, matrix/delta/roll risk)
 *  - unrealised PnL, equity
 *  - portfolio-level Greeks (delta, gamma, vega, theta, rho)
 *  - individual positions with mark prices and position Greeks
 */
export async function getAccountState(
  client: KyanClient,
  account: string,
): Promise<AccountState> {
  return client.get("/account-state", { account });
}

/**
 * Fetch paginated account history (v2, Beta).
 *
 * Uses cursor-based pagination — pass `next_cursor` from the previous
 * response as `cursor` to retrieve the next page.
 *
 * Events carry second-based timestamps and a unique `id`.
 *
 * @example
 * ```ts
 * // First page
 * const page1 = await getAccountHistory(client, { markets: ["ETH_USDC"] });
 * // Next page
 * if (page1.next_cursor) {
 *   const page2 = await getAccountHistory(client, { cursor: page1.next_cursor });
 * }
 * ```
 */
export async function getAccountHistory(
  client: KyanClient,
  params?: AccountHistoryParams,
): Promise<AccountHistoryResponse> {
  const query: Record<string, string> = {};

  if (params?.cursor) query.cursor = params.cursor;
  if (params?.event_types) query.event_types = params.event_types.join(",");
  if (params?.actions) query.actions = params.actions.join(",");
  if (params?.markets) query.markets = params.markets.join(",");
  if (params?.transfer_type) query.transfer_type = params.transfer_type;
  if (params?.sortKey) query.sortKey = params.sortKey;
  if (params?.sortOrder) query.sortOrder = params.sortOrder;

  return client.get("/v2/account-history", query);
}

/**
 * Fetch all current positions across every margin account.
 */
export async function getPositions(
  client: KyanClient,
): Promise<PositionsResponse> {
  return client.get("/positions");
}
