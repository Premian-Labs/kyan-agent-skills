/**
 * One-click trading session management and dead man's switch heartbeat.
 *
 * One-click sessions allow traders to skip per-order EIP-712 signing by
 * creating a session hash that is sent as the `x-one-click` header on
 * subsequent requests. Sessions are valid for 24 hours and auto-refresh
 * when order operations are performed.
 */

import type { Address } from "viem";
import type { KyanClient, RequestOptions } from "./client.js";
import type { SignatureData } from "./orders.js";

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

export interface CreateSessionResponse {
  /** Session hash — use as the `x-one-click` header value. */
  hash: string;
}

export interface RevokeSessionResponse {
  /** Number of sessions that were revoked. */
  revokedSessions: number;
}

// ---------------------------------------------------------------------------
// Heartbeat types
// ---------------------------------------------------------------------------

export interface HeartbeatRequest {
  /** Maker address for the heartbeat. */
  maker: Address;
  /** Timeout in seconds. If no heartbeat received within this window, all orders are cancelled. */
  timeout: number;
}

/**
 * Error shape returned when the signature deadline is invalid.
 *
 * The server responds with SIGNATURE_DEADLINE_INVALID and includes
 * the server's view of time so the client can correct clock skew.
 */
export interface HeartbeatDeadlineError {
  error: "SIGNATURE_DEADLINE_INVALID";
  serverTime: number;
  minTimestamp: number;
  maxTimestamp: number;
  givenTimestamp: number;
}

export interface HeartbeatResponse {
  success: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Create Session — POST /session
// ---------------------------------------------------------------------------

/**
 * Create a one-click trading session.
 *
 * The returned `hash` should be sent as the `x-one-click` header on
 * all subsequent trading requests to skip per-order signing.
 *
 * Sessions are valid for 24 hours and auto-refresh on order operations.
 *
 * @param client        - KyanClient instance
 * @param signatureData - EIP-712 signature for session creation
 * @param options       - Optional request options
 */
export async function createSession(
  client: KyanClient,
  signatureData: SignatureData,
  options?: RequestOptions,
): Promise<CreateSessionResponse> {
  const body = {
    signature: signatureData.signature,
    signature_deadline: signatureData.signature_deadline,
  };
  return client.post<CreateSessionResponse>("/session", body, options);
}

// ---------------------------------------------------------------------------
// Revoke Session — DELETE /session
// ---------------------------------------------------------------------------

/**
 * Revoke one-click trading sessions.
 *
 * Behavior depends on the `x-one-click` header:
 * - With `x-one-click` header set: revokes only that specific session
 * - Without `x-one-click` header: revokes ALL sessions for the API key
 *
 * @param client      - KyanClient instance
 * @param sessionHash - If provided, sent as x-one-click to revoke that session only
 * @param options     - Optional request options
 */
export async function revokeSession(
  client: KyanClient,
  sessionHash?: string,
  options?: RequestOptions,
): Promise<RevokeSessionResponse> {
  const reqOptions: RequestOptions = { ...options };
  if (sessionHash) {
    reqOptions.oneClickHash = sessionHash;
  }
  return client.delete<RevokeSessionResponse>(
    "/session",
    undefined,
    reqOptions,
  );
}

// ---------------------------------------------------------------------------
// Heartbeat — POST /heartbeat
// ---------------------------------------------------------------------------

/**
 * Send a dead man's switch heartbeat.
 *
 * If the server does not receive another heartbeat within `timeout`
 * seconds, ALL open orders for the given maker are automatically
 * cancelled. This is a safety mechanism for automated trading systems.
 *
 * If the signature deadline is out of the acceptable range, the server
 * returns a SIGNATURE_DEADLINE_INVALID error with:
 * - `serverTime`    — the server's current unix timestamp
 * - `minTimestamp`   — earliest acceptable deadline
 * - `maxTimestamp`   — latest acceptable deadline
 * - `givenTimestamp` — the deadline you provided
 *
 * @param client        - KyanClient instance
 * @param maker         - Maker address
 * @param timeout       - Timeout in seconds for the dead man's switch
 * @param signatureData - EIP-712 signature for the heartbeat
 * @param options       - Optional request options (e.g. oneClickHash)
 */
export async function postHeartbeat(
  client: KyanClient,
  maker: Address,
  timeout: number,
  signatureData: SignatureData,
  options?: RequestOptions,
): Promise<HeartbeatResponse> {
  const body = {
    maker,
    timeout,
    signature: signatureData.signature,
    signature_deadline: signatureData.signature_deadline,
  };
  return client.post<HeartbeatResponse>("/heartbeat", body, options);
}
