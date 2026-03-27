/**
 * Order cancellation operations.
 *
 * Provides selective and bulk cancellation with a 4-bucket response
 * model that accounts for asynchronous order lifecycle states.
 */

import type { Address } from "viem";
import type { KyanClient, RequestOptions } from "./client.js";
import type { CancelOrdersResponse } from "../../shared/src/types.js";
import type { SignatureData } from "./orders.js";

// ---------------------------------------------------------------------------
// Cancel All — response is a subset of the 4-bucket response
// ---------------------------------------------------------------------------

export interface CancelAllOrdersResponse {
  orders_cancelled: string[];
  orders_pending_cancel: string[];
}

// ---------------------------------------------------------------------------
// Cancel Orders — DELETE /orders
// ---------------------------------------------------------------------------

/**
 * Cancel specific orders by ID.
 *
 * The response contains four buckets:
 * - `orders_cancelled`      — successfully cancelled immediately
 * - `orders_pending_cancel` — cancellation request accepted, will resolve asynchronously
 * - `rejected_cancellations` — could not be cancelled (e.g. already filled)
 * - `orders_not_found`      — unknown order IDs
 *
 * Ownership validation is enforced server-side: you can only cancel
 * orders belonging to the authenticated maker address (prevents IDOR).
 *
 * @param client        - KyanClient instance
 * @param maker         - The maker address that owns the orders
 * @param orderIds      - Array of order IDs to cancel
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function cancelOrders(
  client: KyanClient,
  maker: Address,
  orderIds: string[],
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<CancelOrdersResponse> {
  const body: Record<string, unknown> = {
    maker,
    order_ids: orderIds,
  };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.delete<CancelOrdersResponse>("/orders", body, options);
}

// ---------------------------------------------------------------------------
// Cancel All Orders — DELETE /orders_all
// ---------------------------------------------------------------------------

/**
 * Cancel ALL open orders for the given maker address.
 *
 * Response contains two buckets:
 * - `orders_cancelled`      — immediately cancelled
 * - `orders_pending_cancel` — will resolve asynchronously
 *
 * @param client        - KyanClient instance
 * @param maker         - The maker address whose orders to cancel
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function cancelAllOrders(
  client: KyanClient,
  maker: Address,
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<CancelAllOrdersResponse> {
  const body: Record<string, unknown> = { maker };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.delete<CancelAllOrdersResponse>("/orders_all", body, options);
}
