/**
 * Order management — limit, market, and combo order placement plus editing.
 *
 * Uses shared types from @kyan-skills/shared for request/response shapes.
 */

import type { Address } from "viem";
import type { KyanClient, RequestOptions } from "./client.js";
import type {
  LimitOrderRequest,
  MarketOrderRequest,
  ComboOrderRequest,
  Direction,
  InstrumentName,
} from "../../shared/src/types.js";

// ---------------------------------------------------------------------------
// Signature data — required when NOT using a one-click session
// ---------------------------------------------------------------------------

export interface SignatureData {
  /** Hex-encoded EIP-712 signature. */
  signature: string;
  /** Unix timestamp (seconds) after which the signature expires. */
  signature_deadline: number;
}

// ---------------------------------------------------------------------------
// Limit Orders  — POST /limit
// ---------------------------------------------------------------------------

/**
 * Response from posting limit orders.
 *
 * `posted` contains successfully posted order objects.
 * `rejected` contains objects with a `reason` field explaining the rejection.
 */
export interface PostLimitOrdersResponse {
  posted: Array<{
    order_id: string;
    instrument_name: InstrumentName;
    direction: Direction;
    price: number;
    contracts?: number;
    amount?: number;
    [key: string]: unknown;
  }>;
  rejected: Array<{
    reason: string;
    [key: string]: unknown;
  }>;
}

/**
 * Post one or more limit orders.
 *
 * @remarks
 * - v1.18.0: An empty orders array is rejected by the server.
 * - v1.18.0: `additionalProperties: false` is enforced — do not include
 *   extra fields in each order object.
 * - v1.18.0: `taker` field is restricted to the zero address
 *   (`0x0000000000000000000000000000000000000000`) only.
 *
 * @param client        - KyanClient instance
 * @param orders        - Array of limit order requests
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function postLimitOrders(
  client: KyanClient,
  orders: LimitOrderRequest[],
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<PostLimitOrdersResponse> {
  const body: Record<string, unknown> = { orders };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.post<PostLimitOrdersResponse>("/limit", body, options);
}

// ---------------------------------------------------------------------------
// Edit Limit Order — PATCH /limit
// ---------------------------------------------------------------------------

export interface EditLimitOrderUpdates {
  contracts?: number;
  amount?: number;
  price?: number;
  post_only?: boolean;
  mmp?: boolean;
}

/**
 * Edit an existing limit order.
 *
 * WARNING (v1.17.0 breaking change): Editing creates a NEW order_id.
 * The original order receives a CancelOrder event and the replacement
 * receives a PostOrder event. Consumers tracking order IDs must handle
 * this ID change.
 *
 * @param client        - KyanClient instance
 * @param orderId       - The order_id of the order to edit
 * @param updates       - Fields to update
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function editLimitOrder(
  client: KyanClient,
  orderId: string,
  updates: EditLimitOrderUpdates,
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<PostLimitOrdersResponse> {
  const body: Record<string, unknown> = {
    order_id: orderId,
    ...updates,
  };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.patch<PostLimitOrdersResponse>("/limit", body, options);
}

// ---------------------------------------------------------------------------
// Market Order — POST /market
// ---------------------------------------------------------------------------

export interface PostMarketOrderResponse {
  trade_id: string;
  instrument_name: InstrumentName;
  direction: Direction;
  price: number;
  contracts?: number;
  amount?: number;
  [key: string]: unknown;
}

/**
 * Post a market order. Executes immediately against resting liquidity.
 *
 * @param client        - KyanClient instance
 * @param trade         - Market order request
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function postMarketOrder(
  client: KyanClient,
  trade: MarketOrderRequest,
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<PostMarketOrderResponse> {
  const body: Record<string, unknown> = { ...trade };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.post<PostMarketOrderResponse>("/market", body, options);
}

// ---------------------------------------------------------------------------
// Combo Order — POST /combo
// ---------------------------------------------------------------------------

export interface PostComboOrderResponse {
  trade_id: string;
  legs: Array<{
    instrument_name: InstrumentName;
    direction: Direction;
    price: number;
    contracts?: number;
    amount?: number;
    [key: string]: unknown;
  }>;
  total_net_premium: number;
  [key: string]: unknown;
}

/**
 * Post a combo (multi-leg) order.
 *
 * @remarks
 * - `total_net_premium` sign convention: negative = net debit (taker pays),
 *   positive = net credit (taker receives).
 * - Only options legs contribute to the net premium calculation;
 *   perpetual legs are excluded from the premium.
 *
 * @param client        - KyanClient instance
 * @param combo         - Combo order request
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function postComboOrder(
  client: KyanClient,
  combo: ComboOrderRequest,
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<PostComboOrderResponse> {
  const body: Record<string, unknown> = { ...combo };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.post<PostComboOrderResponse>("/combo", body, options);
}
