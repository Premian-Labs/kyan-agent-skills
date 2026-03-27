/**
 * RFQ (Request for Quote) block trading flow.
 *
 * The RFQ lifecycle:
 *   1. Taker submits an RFQ request (describes the legs they want quoted)
 *   2. Market makers receive the request and submit responses (quotes)
 *   3. Taker reviews responses and fills the best one
 *
 * Constraint: an RFQ response must contain ALL options legs OR exactly
 * ONE perpetual leg. Mixing options and perpetuals in a single response
 * is not allowed.
 */

import type { Address } from "viem";
import type { KyanClient, RequestOptions } from "./client.js";
import type {
  ComboLeg,
  Direction,
  InstrumentName,
} from "../../shared/src/types.js";
import type { SignatureData } from "./orders.js";

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface RFQRequestPayload {
  legs: ComboLeg[];
}

export interface RFQRequestEntry {
  request_id: string;
  legs: ComboLeg[];
  created_at: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface RFQResponsePayload {
  request_id: string;
  legs: Array<{
    instrument_name: InstrumentName;
    direction: Direction;
    price: number;
    contracts?: number;
    amount?: number;
  }>;
  [key: string]: unknown;
}

export interface RFQResponseEntry {
  response_id: string;
  request_id: string;
  legs: Array<{
    instrument_name: InstrumentName;
    direction: Direction;
    price: number;
    contracts?: number;
    amount?: number;
  }>;
  created_at: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Fill types
// ---------------------------------------------------------------------------

export interface RFQFillResponse {
  trade_id: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Submit RFQ Request — POST /rfq/request
// ---------------------------------------------------------------------------

/**
 * Submit a new RFQ request describing the legs you want quoted.
 *
 * @param client  - KyanClient instance
 * @param request - The RFQ request payload with legs
 * @param options - Optional request options
 */
export async function submitRFQRequest(
  client: KyanClient,
  request: RFQRequestPayload,
  options?: RequestOptions,
): Promise<RFQRequestEntry> {
  return client.post<RFQRequestEntry>("/rfq/request", request, options);
}

// ---------------------------------------------------------------------------
// Get RFQ Requests — GET /rfq/requests
// ---------------------------------------------------------------------------

/**
 * Retrieve all active RFQ requests.
 *
 * @param client  - KyanClient instance
 * @param options - Optional request options
 */
export async function getRFQRequests(
  client: KyanClient,
  options?: RequestOptions,
): Promise<RFQRequestEntry[]> {
  return client.get<RFQRequestEntry[]>("/rfq/requests", undefined, options);
}

// ---------------------------------------------------------------------------
// Submit RFQ Response — POST /rfq/response
// ---------------------------------------------------------------------------

/**
 * Submit a quote (response) to an existing RFQ request.
 *
 * Constraint: ALL legs must be options OR exactly ONE perpetual.
 * Mixing options and perpetuals in a single response is rejected.
 *
 * @param client   - KyanClient instance
 * @param response - The RFQ response payload with pricing
 * @param options  - Optional request options
 */
export async function submitRFQResponse(
  client: KyanClient,
  response: RFQResponsePayload,
  options?: RequestOptions,
): Promise<RFQResponseEntry> {
  return client.post<RFQResponseEntry>("/rfq/response", response, options);
}

// ---------------------------------------------------------------------------
// Get RFQ Responses — GET /rfq/responses
// ---------------------------------------------------------------------------

/**
 * Retrieve all RFQ responses visible to the authenticated user.
 *
 * @param client  - KyanClient instance
 * @param options - Optional request options
 */
export async function getRFQResponses(
  client: KyanClient,
  options?: RequestOptions,
): Promise<RFQResponseEntry[]> {
  return client.get<RFQResponseEntry[]>("/rfq/responses", undefined, options);
}

// ---------------------------------------------------------------------------
// Fill RFQ — POST /rfq/fill
// ---------------------------------------------------------------------------

/**
 * Fill (execute) an RFQ response, completing the block trade.
 *
 * @param client        - KyanClient instance
 * @param taker         - Address of the taker executing the fill
 * @param responseId    - The response_id to fill
 * @param signatureData - Required when not using a one-click session
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function fillRFQ(
  client: KyanClient,
  taker: Address,
  responseId: string,
  signatureData?: SignatureData,
  options?: RequestOptions,
): Promise<RFQFillResponse> {
  const body: Record<string, unknown> = {
    taker,
    response_id: responseId,
  };
  if (signatureData) {
    body.signature = signatureData.signature;
    body.signature_deadline = signatureData.signature_deadline;
  }
  return client.post<RFQFillResponse>("/rfq/fill", body, options);
}
