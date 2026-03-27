// ============================================================================
// Session Recovery
// Protocol for recovering WebSocket sessions after disconnection.
//
// Flow:
//   1. enableSessionRecovery(ws) — server returns { recovery_token, ttl_seconds }
//   2. On disconnect, reconnect within ttl_seconds (default 30s)
//   3. recoverSession(ws, recoveryToken) — server replays missed messages
//
// Server behavior:
//   - Buffers up to 1000 messages during disconnection
//   - Restores all channel subscriptions on recovery
//   - Sequence numbers remain continuous for gap detection
//   - Recovery token expires after ttl_seconds (default 30)
// ============================================================================

import type { KyanWebSocket } from "./client.js";
import type {
  EnableSessionRecoveryResponse,
  RecoverSessionResponse,
  WSMessage,
} from "./types.js";

/** Default recovery window in seconds */
export const DEFAULT_RECOVERY_TTL_SECONDS = 30;

/** Maximum messages the server will buffer during disconnection */
export const MAX_BUFFERED_MESSAGES = 1000;

export interface SessionRecoveryInfo {
  /** Token to use when reconnecting */
  recovery_token: string;
  /** Seconds before the recovery token expires */
  ttl_seconds: number;
}

export interface SessionRecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Number of channel subscriptions restored */
  subscriptions_restored: number;
  /** Number of buffered messages replayed */
  messages_replayed: number;
}

/**
 * Enable session recovery on the current connection.
 *
 * Must be called after authentication. Returns a recovery token that can be
 * used to restore the session after a disconnection (within ttl_seconds).
 *
 * @example
 * ```ts
 * const ws = new KyanWebSocket({ apiKey: "..." });
 * await ws.connect();
 * const { recovery_token, ttl_seconds } = await enableSessionRecovery(ws);
 * // Store recovery_token for use after reconnection
 * ```
 */
export async function enableSessionRecovery(
  ws: KyanWebSocket,
): Promise<SessionRecoveryInfo> {
  const response = (await ws.sendRequest({
    type: "enable_session_recovery",
  })) as EnableSessionRecoveryResponse;

  return {
    recovery_token: response.recovery_token,
    ttl_seconds: response.ttl_seconds,
  };
}

/**
 * Recover a previous session after reconnecting.
 *
 * Must be called immediately after connect() on a new WebSocket, instead of
 * re-subscribing to channels manually. The server will:
 *   1. Restore all previous channel subscriptions
 *   2. Replay up to 1000 buffered messages in sequence order
 *   3. Resume normal event delivery
 *
 * Sequence numbers continue from where they left off, so gap detection
 * remains accurate across the recovery boundary.
 *
 * @param ws - A freshly connected (and authenticated) KyanWebSocket
 * @param recoveryToken - The token from enableSessionRecovery()
 *
 * @example
 * ```ts
 * // After disconnect, reconnect within 30 seconds:
 * const ws = new KyanWebSocket({ apiKey: "..." });
 * await ws.connect();
 * const result = await recoverSession(ws, savedRecoveryToken);
 * console.log(`Restored ${result.subscriptions_restored} subs, replayed ${result.messages_replayed} msgs`);
 * ```
 */
export async function recoverSession(
  ws: KyanWebSocket,
  recoveryToken: string,
): Promise<SessionRecoveryResult> {
  const response = (await ws.sendRequest({
    type: "recover_session",
    recovery_token: recoveryToken,
  })) as RecoverSessionResponse;

  return {
    success: response.success,
    subscriptions_restored: response.subscriptions_restored ?? 0,
    messages_replayed: response.messages_replayed ?? 0,
  };
}
