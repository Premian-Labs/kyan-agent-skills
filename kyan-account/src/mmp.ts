/**
 * Market Maker Protection (MMP) configuration.
 *
 * MMP provides automated protection for market makers by freezing quoting
 * activity when risk limits are breached within a configured time interval.
 *
 * Configuration is partially signed via EIP-712: the core fields
 * (address, pair, status, interval, frozenTime, deadline) are signed,
 * while risk limit fields (quantityLimit, deltaLimit, vegaLimit) are
 * included in the request body but NOT part of the signature.
 */

import type { TradingPair } from "../../shared/src/types.js";

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

/** MMP operational status. */
export type MMPStatus = "active" | "frozen";

/** MMP configuration as returned by the API. */
export interface MMPConfig {
  smart_account_address: string;
  pair_symbol: TradingPair;
  status: MMPStatus;
  /** Rolling window in seconds for limit checks. */
  interval: number;
  /** Duration in seconds the account stays frozen after a breach. */
  frozen_time: number;
  /** Maximum net quantity change within the interval. */
  quantity_limit?: number;
  /** Maximum net delta change within the interval. */
  delta_limit?: number;
  /** Maximum net vega change within the interval. */
  vega_limit?: number;
}

/**
 * EIP-712 signature data for MMP configuration changes.
 *
 * The signed message covers exactly 6 fields:
 *  1. smartAccountAddress
 *  2. pairSymbol
 *  3. status
 *  4. interval
 *  5. frozenTime
 *  6. deadline
 *
 * Risk limit fields (quantityLimit, deltaLimit, vegaLimit) are in the
 * request body but are NOT included in the EIP-712 signature.
 */
export interface MMPSignatureData {
  signature: string;
  nonce: string;
  deadline: number;
  signer: string;
}

/** Request body for setting MMP configuration. */
export interface SetMMPConfigRequest {
  smart_account_address: string;
  pair_symbol: TradingPair;
  status: MMPStatus;
  interval: number;
  frozen_time: number;
  /** NOT signed — risk limit for net quantity change. */
  quantity_limit?: number;
  /** NOT signed — risk limit for net delta change. */
  delta_limit?: number;
  /** NOT signed — risk limit for net vega change. */
  vega_limit?: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Retrieve the current MMP configuration for a trading pair.
 *
 * @param pair  The trading pair to query MMP config for.
 */
export async function getMMPConfig(
  client: KyanClient,
  pair: TradingPair,
): Promise<MMPConfig> {
  return client.get("/mmp-config", { pair });
}

/**
 * Set or update the MMP configuration for a trading pair.
 *
 * Requires an EIP-712 signature covering the 6 core fields:
 * smartAccountAddress, pairSymbol, status, interval, frozenTime, deadline.
 *
 * The risk limit fields (quantity_limit, delta_limit, vega_limit) are
 * included in the request body but are NOT part of the signed message.
 * This allows adjusting risk thresholds without re-signing.
 *
 * @param config         MMP configuration to apply
 * @param signatureData  EIP-712 signature over the core fields
 *
 * @example
 * ```ts
 * await setMMPConfig(client, {
 *   smart_account_address: "0x...",
 *   pair_symbol: "ETH_USDC",
 *   status: "active",
 *   interval: 10,
 *   frozen_time: 300,
 *   quantity_limit: 100,
 *   delta_limit: 50,
 *   vega_limit: 1000,
 * }, signatureData);
 * ```
 */
export async function setMMPConfig(
  client: KyanClient,
  config: SetMMPConfigRequest,
  signatureData: MMPSignatureData,
): Promise<MMPConfig> {
  return client.post("/mmp-config", {
    ...config,
    ...signatureData,
  });
}
