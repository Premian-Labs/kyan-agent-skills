// ============================================================================
// Channel Subscription Helpers
// Typed convenience functions for subscribing to each of the 16 Kyan channels.
// ============================================================================

import type { KyanWebSocket } from "./client.js";
import type { WSMessage } from "./types.js";

// ---------------------------------------------------------------------------
// 1. index_price — real-time index price for a trading pair
// ---------------------------------------------------------------------------

export function subscribeIndexPrice(ws: KyanWebSocket, pair: string): Promise<WSMessage> {
  return ws.subscribe("index_price", { pair });
}

// ---------------------------------------------------------------------------
// 2. instruments — instrument listings, optionally filtered by market
// ---------------------------------------------------------------------------

export function subscribeInstruments(ws: KyanWebSocket, market?: string): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (market) query.market = market;
  return ws.subscribe("instruments", query);
}

// ---------------------------------------------------------------------------
// 3. funding — funding rate updates for a specific perp instrument
// ---------------------------------------------------------------------------

export function subscribeFunding(ws: KyanWebSocket, instrumentName: string): Promise<WSMessage> {
  return ws.subscribe("funding", { instrument_name: instrumentName });
}

// ---------------------------------------------------------------------------
// 4. interest_rate — interest rate data for a pair with optional expiry
// ---------------------------------------------------------------------------

export function subscribeInterestRate(
  ws: KyanWebSocket,
  pair: string,
  expiry?: string,
): Promise<WSMessage> {
  const query: Record<string, unknown> = { pair };
  if (expiry) query.expiry = expiry;
  return ws.subscribe("interest_rate", query);
}

// ---------------------------------------------------------------------------
// 5. iv — implied volatility (SVI model). NOTE: event type is "svi", not "iv"
// ---------------------------------------------------------------------------

export function subscribeIV(
  ws: KyanWebSocket,
  pair: string,
  maturity?: string,
): Promise<WSMessage> {
  const query: Record<string, unknown> = { pair };
  if (maturity) query.maturity = maturity;
  return ws.subscribe("iv", query);
}

// ---------------------------------------------------------------------------
// 6. orderbook_perps — perpetual orderbook events
// ---------------------------------------------------------------------------

export interface OrderbookPerpsOpts {
  instrument_name?: string;
  pair?: string;
  direction?: string;
  skip_snapshot?: boolean;
}

export function subscribeOrderbookPerps(
  ws: KyanWebSocket,
  opts: OrderbookPerpsOpts,
): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (opts.instrument_name) query.instrument_name = opts.instrument_name;
  if (opts.pair) query.pair = opts.pair;
  if (opts.direction) query.direction = opts.direction;
  if (opts.skip_snapshot !== undefined) query.skip_snapshot = opts.skip_snapshot;
  return ws.subscribe("orderbook_perps", query);
}

// ---------------------------------------------------------------------------
// 7. orderbook_options — options orderbook events
// ---------------------------------------------------------------------------

export interface OrderbookOptionsOpts {
  instrument_name?: string;
  pair?: string;
  maturity?: string;
  strike?: string;
  type?: string;
  direction?: string;
  skip_snapshot?: boolean;
}

export function subscribeOrderbookOptions(
  ws: KyanWebSocket,
  opts: OrderbookOptionsOpts,
): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (opts.instrument_name) query.instrument_name = opts.instrument_name;
  if (opts.pair) query.pair = opts.pair;
  if (opts.maturity) query.maturity = opts.maturity;
  if (opts.strike) query.strike = opts.strike;
  if (opts.type) query.type = opts.type;
  if (opts.direction) query.direction = opts.direction;
  if (opts.skip_snapshot !== undefined) query.skip_snapshot = opts.skip_snapshot;
  return ws.subscribe("orderbook_options", query);
}

// ---------------------------------------------------------------------------
// 8. orderbook_maker — all orders for a specific maker address
//    Receives unique ob_maker_orders snapshot event
// ---------------------------------------------------------------------------

export function subscribeOrderbookMaker(
  ws: KyanWebSocket,
  maker: string,
  pair?: string,
): Promise<WSMessage> {
  const query: Record<string, unknown> = { maker };
  if (pair) query.pair = pair;
  return ws.subscribe("orderbook_maker", query);
}

// ---------------------------------------------------------------------------
// 9. account_state — account margin/collateral state
// ---------------------------------------------------------------------------

export function subscribeAccountState(
  ws: KyanWebSocket,
  account: string,
  pair?: string,
): Promise<WSMessage> {
  const query: Record<string, unknown> = { account };
  if (pair) query.pair = pair;
  return ws.subscribe("account_state", query);
}

// ---------------------------------------------------------------------------
// 10. position — account positions (polled every second by the server)
// ---------------------------------------------------------------------------

export function subscribePosition(
  ws: KyanWebSocket,
  account: string,
  market?: string,
): Promise<WSMessage> {
  const query: Record<string, unknown> = { account };
  if (market) query.market = market;
  return ws.subscribe("position", query);
}

// ---------------------------------------------------------------------------
// 11. trade — trade events, all fields optional
// ---------------------------------------------------------------------------

export interface TradeOpts {
  account?: string;
  pair?: string;
  direction?: string;
}

export function subscribeTrade(ws: KyanWebSocket, opts?: TradeOpts): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (opts?.account) query.account = opts.account;
  if (opts?.pair) query.pair = opts.pair;
  if (opts?.direction) query.direction = opts.direction;
  return ws.subscribe("trade", query);
}

// ---------------------------------------------------------------------------
// 12. transfer — deposit/withdrawal events for an account
// ---------------------------------------------------------------------------

export interface TransferOpts {
  symbol?: string;
  type?: string;
}

export function subscribeTransfer(
  ws: KyanWebSocket,
  account: string,
  opts?: TransferOpts,
): Promise<WSMessage> {
  const query: Record<string, unknown> = { account };
  if (opts?.symbol) query.symbol = opts.symbol;
  if (opts?.type) query.type = opts.type;
  return ws.subscribe("transfer", query);
}

// ---------------------------------------------------------------------------
// 13. account_liquidation — NOT YET DELIVERING EVENTS
//     Channel exists in the API but the server does not yet push events.
// ---------------------------------------------------------------------------

export function subscribeAccountLiquidation(
  ws: KyanWebSocket,
  account: string,
): Promise<WSMessage> {
  // WARNING: This channel is defined but NOT YET DELIVERING EVENTS
  return ws.subscribe("account_liquidation", { account });
}

// ---------------------------------------------------------------------------
// 14. bankruptcy — market bankruptcy events
// ---------------------------------------------------------------------------

export function subscribeBankruptcy(ws: KyanWebSocket, market?: string): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (market) query.market = market;
  return ws.subscribe("bankruptcy", query);
}

// ---------------------------------------------------------------------------
// 15. mmp — Market Maker Protection triggered events
//     Event type is "mmp_triggered"
// ---------------------------------------------------------------------------

export interface MMPOpts {
  smart_account_address?: string;
  pair?: string;
}

export function subscribeMMP(ws: KyanWebSocket, opts?: MMPOpts): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (opts?.smart_account_address) query.smart_account_address = opts.smart_account_address;
  if (opts?.pair) query.pair = opts.pair;
  return ws.subscribe("mmp", query);
}

// ---------------------------------------------------------------------------
// 16. rfq — Request For Quote events
//     Event types: rfq_request, rfq_post_response, rfq_cancel_response
// ---------------------------------------------------------------------------

export interface RFQOpts {
  account?: string;
  type?: string;
  order_id?: string;
}

export function subscribeRFQ(ws: KyanWebSocket, opts?: RFQOpts): Promise<WSMessage> {
  const query: Record<string, unknown> = {};
  if (opts?.account) query.account = opts.account;
  if (opts?.type) query.type = opts.type;
  if (opts?.order_id) query.order_id = opts.order_id;
  return ws.subscribe("rfq", query);
}
