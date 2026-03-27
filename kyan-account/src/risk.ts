/**
 * Risk calculation and portfolio margin model for the Kyan derivatives exchange.
 *
 * The exchange uses a portfolio margin system that evaluates positions
 * holistically rather than in isolation. Margin requirements are driven by
 * three risk components plus a maintenance multiplier.
 */

import type { PortfolioGreeks } from "../../shared/src/types.js";

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

type KyanClient = {
  get: (path: string, params?: Record<string, string>) => Promise<any>;
  post: (path: string, body?: unknown) => Promise<any>;
  delete: (path: string, body?: unknown) => Promise<any>;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A position to include in the risk calculation. */
export interface RiskPosition {
  instrument_name: string;
  size: number;
  direction: "buy" | "sell";
}

/** Portfolio submitted for risk evaluation. */
export interface RiskPortfolio {
  pair: string;
  positions: RiskPosition[];
}

/** Risk metrics returned per settlement date. */
export interface SettlementProjection {
  settlement_date: string;
  im: number;
  mm: number;
  matrix_risk: number;
  delta_risk: number;
  roll_risk: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

/** Full response from the risk calculation endpoint. */
export interface RiskCalculationResponse {
  im: number;
  mm: number;
  matrix_risk: number;
  delta_risk: number;
  roll_risk: number;
  portfolio_greeks: PortfolioGreeks;
  future_settlement_projections: SettlementProjection[];
}

// ---------------------------------------------------------------------------
// Portfolio Margin Model — Constants & Documentation
// ---------------------------------------------------------------------------

/**
 * Portfolio Margin Model
 *
 * Kyan uses a portfolio margin model that evaluates all positions in a margin
 * account holistically. Margin requirements come from three additive risk
 * components:
 *
 * 1. **Matrix Risk** — The primary stress-test component. A matrix of
 *    scenarios is applied combining underlying price movements (up/down by
 *    fixed percentages) with implied volatility shifts. The worst-case
 *    portfolio loss across all scenarios becomes the matrix risk charge.
 *
 * 2. **Delta Risk** — An additional margin charge for large directional
 *    (delta) exposures that may not be fully captured by the matrix scenarios.
 *
 * 3. **Roll Risk** — An extra charge applied to near-expiry options to
 *    account for the increased gamma/pin risk as expiration approaches.
 *
 * These three components sum to the base margin requirement.
 */

/** Maintenance margin is 1.2x the base requirement. */
export const MM_MULTIPLIER = 1.2;

/**
 * Margin thresholds:
 *
 * - **Initial Margin (IM)**: Collateral required to open or increase a position.
 *   IM = matrix_risk + delta_risk + roll_risk
 *
 * - **Maintenance Margin (MM)**: Minimum collateral to keep positions open.
 *   MM = IM * 1.2 (the MM_MULTIPLIER).
 *   When equity drops below MM, the account enters liquidation.
 */

/**
 * Liquidation mechanics:
 *
 * Liquidation is triggered when equity < maintenance margin (MM).
 * The liquidation engine will close positions to bring the account back
 * above the maintenance threshold. Liquidation trades incur higher fees
 * (see fee schedules in shared/constants).
 */

/**
 * Pricing model:
 *
 * - Options are priced using **Black-Scholes** with an **SVI (Stochastic
 *   Volatility Inspired) volatility surface** fitted to market data.
 * - Underlying price feeds come from **Chainlink oracles**.
 * - Mark prices are derived from the model and used for margin calculations,
 *   unrealised PnL, and Greeks computation.
 */

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Calculate risk metrics for a hypothetical portfolio.
 *
 * Submits a set of positions to the risk engine and receives back:
 *  - Aggregate IM, MM, and the three risk components
 *  - Portfolio-level Greeks
 *  - Per-settlement-date projections showing how risk evolves across
 *    upcoming expiration dates
 *
 * Use this to preview margin impact before placing trades.
 *
 * @example
 * ```ts
 * const risk = await calculateUserRisk(client, {
 *   pair: "ETH_USDC",
 *   positions: [
 *     { instrument_name: "ETH_USDC-PERPETUAL", size: 1, direction: "buy" },
 *     { instrument_name: "ETH_USDC-31OCT25-4000-C", size: -5, direction: "sell" },
 *   ],
 * });
 * console.log(`IM: ${risk.im}, MM: ${risk.mm}`);
 * console.log(`Settlements:`, risk.future_settlement_projections);
 * ```
 */
export async function calculateUserRisk(
  client: KyanClient,
  portfolio: RiskPortfolio,
): Promise<RiskCalculationResponse> {
  return client.post("/calculate-user-risk", portfolio);
}
