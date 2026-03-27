// ============================================================================
// KyanWebSocket Client
// Manages WebSocket connection to Kyan derivatives exchange with auth,
// subscriptions, reconnection, and request/response correlation.
// ============================================================================

// Ambient declarations for WebSocket API (works in both Node 18+ and browser)
/* eslint-disable no-var */
declare var WebSocket: {
  new (url: string): WebSocket;
  readonly OPEN: number;
  readonly CLOSED: number;
  readonly CONNECTING: number;
  readonly CLOSING: number;
};

interface WebSocket {
  readonly readyState: number;
  onopen: ((event: any) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onmessage: ((event: { data: any }) => void) | null;
  onerror: ((event: any) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

declare function setTimeout(callback: (...args: any[]) => void, ms: number): any;
declare function clearTimeout(id: any): void;

declare var console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
};
/* eslint-enable no-var */

import type {
  KyanWebSocketConfig,
  WSMessage,
  AuthRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  GetSubscriptionsResponse,
} from "./types.js";

const DEFAULT_URL = "wss://staging.kyan.sh/ws";
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_INTERVAL_MS = 1000;
const MAX_RECONNECT_INTERVAL_MS = 30000;

type EventHandler = (data: any) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * KyanWebSocket — streaming client for the Kyan derivatives exchange.
 *
 * Usage:
 *   const ws = new KyanWebSocket({ apiKey: "your-api-key" });
 *   await ws.connect();
 *   await ws.subscribe("orderbook_perps", { pair: "BTC_USDC" });
 *   ws.on("ob_snapshot", (msg) => console.log(msg));
 */
export class KyanWebSocket {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly autoReconnect: boolean;
  private readonly onMessageCb?: (message: WSMessage) => void;
  private readonly onErrorCb?: (error: Error) => void;
  private readonly onCloseCb?: (code: number, reason: string) => void;

  private ws: WebSocket | null = null;
  private requestCounter = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isClosingIntentionally = false;

  // EventEmitter-style listener map
  private listeners: Map<string, Set<EventHandler>> = new Map();

  // Pending request correlation
  private pendingRequests: Map<string, PendingRequest> = new Map();

  // Sequence tracking for gap detection
  private lastSeqId: number | null = null;

  constructor(config: KyanWebSocketConfig) {
    this.url = config.url ?? DEFAULT_URL;
    this.apiKey = config.apiKey;
    this.autoReconnect = config.autoReconnect ?? true;
    this.onMessageCb = config.onMessage;
    this.onErrorCb = config.onError;
    this.onCloseCb = config.onClose;
  }

  // -------------------------------------------------------------------------
  // EventEmitter pattern
  // -------------------------------------------------------------------------

  /** Register a handler for a specific event type (e.g. "ob_snapshot", "trade") */
  on(eventType: string, handler: EventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  /** Remove a previously registered handler */
  off(eventType: string, handler: EventHandler): void {
    this.listeners.get(eventType)?.delete(handler);
  }

  /** Emit an event to all registered handlers */
  private emit(eventType: string, data: any): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[KyanWS] Error in handler for "${eventType}":`, err);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  /** Open WebSocket and authenticate. Resolves when auth succeeds. */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isClosingIntentionally = false;
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.authenticate()
          .then(() => {
            this.emit("connected", {});
            resolve();
          })
          .catch(reject);
      };

      this.ws.onmessage = (event) => {
        this.handleRawMessage(event.data);
      };

      this.ws.onerror = () => {
        const error = new Error("WebSocket error");
        this.onErrorCb?.(error);
        this.emit("error", error);
      };

      this.ws.onclose = (event) => {
        this.onCloseCb?.(event.code, event.reason);
        this.emit("disconnected", { code: event.code, reason: event.reason });

        if (!this.isClosingIntentionally && this.autoReconnect) {
          this.scheduleReconnect();
        }
      };
    });
  }

  /** Gracefully close the WebSocket connection */
  close(): void {
    this.isClosingIntentionally = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.close(1000, "Client close");
      this.ws = null;
    }
  }

  /** Whether the underlying WebSocket is currently open */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** The last observed sequence ID from the server */
  get currentSeqId(): number | null {
    return this.lastSeqId;
  }

  // -------------------------------------------------------------------------
  // Subscription commands
  // -------------------------------------------------------------------------

  /** Subscribe to a channel with optional query filter. Returns the server response. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe(channel: string, query?: any): Promise<WSMessage> {
    const msg: Record<string, unknown> = { type: "subscribe", channel };
    if (query) msg.query = query;
    return this.sendRequest(msg);
  }

  /** Unsubscribe from a channel. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unsubscribe(channel: string, query?: any): Promise<WSMessage> {
    const msg: Record<string, unknown> = { type: "unsubscribe", channel };
    if (query) msg.query = query;
    return this.sendRequest(msg);
  }

  /** Unsubscribe from all channels at once. */
  unsubscribeAll(): Promise<WSMessage> {
    return this.sendRequest({ type: "unsubscribe_all" });
  }

  /** Get the list of current subscriptions. */
  async getSubscriptions(): Promise<GetSubscriptionsResponse> {
    const response = await this.sendRequest({ type: "get_subscriptions" });
    return response as GetSubscriptionsResponse;
  }

  // -------------------------------------------------------------------------
  // Instrument & orderbook queries
  // -------------------------------------------------------------------------

  /** Request the full instrument list. */
  getInstruments(): Promise<WSMessage> {
    return this.sendRequest({ type: "get_instruments" });
  }

  /** Get orderbook state for specific instrument names. */
  getObState(instruments: string[]): Promise<WSMessage> {
    return this.sendRequest({ type: "get_ob_state_by_instruments", instruments });
  }

  /** Get orderbook state for an entire market. */
  getObStateByMarket(market: string): Promise<WSMessage> {
    return this.sendRequest({ type: "get_ob_state_by_market", market });
  }

  // -------------------------------------------------------------------------
  // Message re-delivery
  // -------------------------------------------------------------------------

  /** Request re-delivery of a previously sent message by its message_id. */
  resend(messageId: string): Promise<WSMessage> {
    return this.sendRequest({ type: "resend", message_id: messageId });
  }

  // -------------------------------------------------------------------------
  // Low-level send
  // -------------------------------------------------------------------------

  /**
   * Send a raw message object. Prefer the typed methods above.
   * Does NOT add an `id` or track the response.
   */
  send(data: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(data));
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Send auth message and wait for confirmation */
  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authMsg: AuthRequest = {
        type: "auth",
        api_key: this.apiKey,
        id: this.nextId(),
      };

      const id = authMsg.id!;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Auth timeout"));
      }, 10_000);

      this.pendingRequests.set(id, {
        resolve: (response: WSMessage) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error ?? "Auth failed"));
          }
        },
        reject,
        timeout,
      });

      this.send(authMsg as unknown as Record<string, unknown>);
    });
  }

  /**
   * Send a request and return a promise that resolves with the server response.
   * Automatically assigns a correlation ID.
   */
  sendRequest(data: Record<string, unknown>, timeoutMs = 10_000): Promise<WSMessage> {
    return new Promise((resolve, reject) => {
      const id = this.nextId();
      data.id = id;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.send(data);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  /** Generate a unique request ID */
  private nextId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  /** Parse and route incoming messages */
  private handleRawMessage(raw: unknown): void {
    let data: string;
    if (typeof raw === "string") {
      data = raw;
    } else {
      // Binary frames not expected, but handle gracefully
      console.warn("[KyanWS] Received non-string message frame");
      return;
    }

    let msg: WSMessage;
    try {
      msg = JSON.parse(data) as WSMessage;
    } catch {
      console.error("[KyanWS] Failed to parse message:", data);
      return;
    }

    // Sequence tracking for gap detection
    if (msg.seq_id !== undefined) {
      if (this.lastSeqId !== null && msg.seq_id > this.lastSeqId + 1) {
        const gap = msg.seq_id - this.lastSeqId - 1;
        console.warn(`[KyanWS] Sequence gap detected: missed ${gap} message(s) (${this.lastSeqId} -> ${msg.seq_id})`);
        this.emit("sequence_gap", {
          expected: this.lastSeqId + 1,
          received: msg.seq_id,
          gap,
        });
      }
      this.lastSeqId = msg.seq_id;
    }

    // Global callback
    this.onMessageCb?.(msg);

    // Route responses to pending request handlers
    if (msg.kind === "response" && msg.id) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(msg.id);
        if (msg.success === false) {
          pending.reject(new Error(msg.error ?? `Request ${msg.id} failed`));
        } else {
          pending.resolve(msg);
        }
        return;
      }
    }

    // Emit by message type for subscription event handlers
    this.emit(msg.type, msg);

    // Also emit a generic "message" event
    this.emit("message", msg);
  }

  /** Schedule a reconnection attempt with exponential backoff */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[KyanWS] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      this.emit("reconnect_failed", { attempts: this.reconnectAttempts });
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_INTERVAL_MS * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_INTERVAL_MS,
    );
    this.reconnectAttempts++;

    console.log(`[KyanWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        console.log("[KyanWS] Reconnected successfully");
        this.emit("reconnected", { attempt: this.reconnectAttempts });
      } catch (err) {
        console.error("[KyanWS] Reconnection failed:", err);
        // onclose will fire and trigger another scheduleReconnect
      }
    }, delay);
  }
}
