/**
 * Integration tests for Kyan WebSocket API.
 *
 * These tests open real WebSocket connections to the staging API.
 * Skipped automatically when KYAN_API_KEY is not set.
 *
 * Run with: KYAN_API_KEY=your_key npm test -- integration/websocket
 */

import { describe, it, expect, afterEach } from "vitest";
import { env, hasApiKey } from "./env.js";

// ── Helpers ────────────────────────────────────────────────────────────

function connectWS(): WebSocket {
  return new WebSocket(env.wsUrl);
}

function sendJSON(ws: WebSocket, msg: object): void {
  ws.send(JSON.stringify(msg));
}

function waitForMessage(
  ws: WebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
  timeoutMs = 10_000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for message")),
      timeoutMs,
    );

    const handler = (event: MessageEvent) => {
      const data = JSON.parse(String(event.data)) as Record<string, unknown>;
      if (predicate(data)) {
        clearTimeout(timer);
        ws.removeEventListener("message", handler);
        resolve(data);
      }
    };

    ws.addEventListener("message", handler);
  });
}

// ── Connection & Auth Tests ───────────────────────────────────────────

const openSockets: WebSocket[] = [];

afterEach(() => {
  for (const ws of openSockets) {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
  openSockets.length = 0;
});

describe.skipIf(!hasApiKey)("WebSocket — Connection & Auth (live)", () => {
  it("connects and authenticates successfully", async () => {
    const ws = connectWS();
    openSockets.push(ws);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Connection failed"));
    });

    // Send auth
    sendJSON(ws, { type: "auth", api_key: env.apiKey, id: "auth-1" });

    const authResponse = await waitForMessage(
      ws,
      (msg) => msg.type === "auth" && msg.id === "auth-1",
    );

    expect(authResponse.success).toBe(true);
    expect(authResponse.kind).toBe("response");
    console.log("  Auth response:", JSON.stringify(authResponse));
  });

  it("rejects invalid API key", async () => {
    const ws = connectWS();
    openSockets.push(ws);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Connection failed"));
    });

    sendJSON(ws, {
      type: "auth",
      api_key: "invalid_key_that_does_not_exist",
      id: "auth-bad",
    });

    const authResponse = await waitForMessage(
      ws,
      (msg) => msg.id === "auth-bad",
    );

    expect(authResponse.success).toBe(false);
    console.log("  Invalid key response:", JSON.stringify(authResponse));
  });
});

// ── Market Data Subscription Tests ────────────────────────────────────

describe.skipIf(!hasApiKey)(
  "WebSocket — Market Data Subscriptions (live)",
  () => {
    async function connectAndAuth(): Promise<WebSocket> {
      const ws = connectWS();
      openSockets.push(ws);

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("Connection failed"));
      });

      sendJSON(ws, { type: "auth", api_key: env.apiKey, id: "auth" });
      const auth = await waitForMessage(ws, (msg) => msg.type === "auth");
      expect(auth.success).toBe(true);
      return ws;
    }

    it("subscribes to index_price and receives data", async () => {
      const ws = await connectAndAuth();

      sendJSON(ws, {
        type: "subscribe",
        channel: "index_price",
        query: { pair: "BTC_USDC" },
        id: "sub-idx",
      });

      // Wait for subscription confirmation
      const subResponse = await waitForMessage(
        ws,
        (msg) => msg.id === "sub-idx",
      );
      expect(subResponse.success).toBe(true);
      console.log("  index_price subscription confirmed");

      // Wait for an actual price event
      const priceEvent = await waitForMessage(
        ws,
        (msg) => msg.type === "index_price",
        15_000,
      );
      expect(priceEvent).toBeDefined();
      console.log(
        "  index_price event received:",
        JSON.stringify(priceEvent).slice(0, 200),
      );
    });

    it("subscribes to instruments channel", async () => {
      const ws = await connectAndAuth();

      sendJSON(ws, {
        type: "subscribe",
        channel: "instruments",
        id: "sub-inst",
      });

      const subResponse = await waitForMessage(
        ws,
        (msg) => msg.id === "sub-inst",
      );
      expect(subResponse.success).toBe(true);
      console.log("  instruments subscription confirmed");

      // Should receive instrument data
      const event = await waitForMessage(
        ws,
        (msg) => msg.type === "instruments",
        15_000,
      );
      expect(event).toBeDefined();
      console.log(
        "  instruments event received:",
        JSON.stringify(event).slice(0, 200),
      );
    });

    it("subscribes to orderbook_perps and receives snapshot", async () => {
      const ws = await connectAndAuth();

      sendJSON(ws, {
        type: "subscribe",
        channel: "orderbook_perps",
        query: { pair: "BTC_USDC" },
        id: "sub-ob",
      });

      const subResponse = await waitForMessage(
        ws,
        (msg) => msg.id === "sub-ob",
      );
      expect(subResponse.success).toBe(true);
      console.log("  orderbook_perps subscription confirmed");

      // Should receive an ob_snapshot
      const snapshot = await waitForMessage(
        ws,
        (msg) =>
          msg.type === "ob_snapshot" ||
          msg.type === "ob_update" ||
          msg.type === "post_order",
        15_000,
      );
      expect(snapshot).toBeDefined();
      console.log(
        "  Orderbook event (%s):",
        snapshot.type,
        JSON.stringify(snapshot).slice(0, 300),
      );
    });

    it("get_instruments command returns instrument list", async () => {
      const ws = await connectAndAuth();

      sendJSON(ws, { type: "get_instruments", id: "get-inst" });

      const response = await waitForMessage(
        ws,
        (msg) => msg.id === "get-inst",
      );
      expect(response.success).toBe(true);
      console.log(
        "  get_instruments response:",
        JSON.stringify(response).slice(0, 300),
      );
    });

    it("unsubscribe_all works", async () => {
      const ws = await connectAndAuth();

      // Subscribe to something first
      sendJSON(ws, {
        type: "subscribe",
        channel: "index_price",
        query: { pair: "BTC_USDC" },
        id: "sub-temp",
      });
      await waitForMessage(ws, (msg) => msg.id === "sub-temp");

      // Unsubscribe all
      sendJSON(ws, { type: "unsubscribe_all", id: "unsub-all" });
      const response = await waitForMessage(
        ws,
        (msg) => msg.id === "unsub-all",
      );
      expect(response.success).toBe(true);
      console.log("  unsubscribe_all confirmed");
    });
  },
);

// ── Session Recovery Test ─────────────────────────────────────────────

describe.skipIf(!hasApiKey)("WebSocket — Session Recovery (live)", () => {
  it("enable_session_recovery returns a recovery token", async () => {
    const ws = connectWS();
    openSockets.push(ws);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Connection failed"));
    });

    sendJSON(ws, { type: "auth", api_key: env.apiKey, id: "auth" });
    const auth = await waitForMessage(ws, (msg) => msg.type === "auth");
    expect(auth.success).toBe(true);

    sendJSON(ws, { type: "enable_session_recovery", id: "recovery" });
    const response = await waitForMessage(
      ws,
      (msg) => msg.id === "recovery",
    );

    expect(response.success).toBe(true);
    expect(response.recovery_token).toBeDefined();
    expect(typeof response.recovery_token).toBe("string");
    expect(response.ttl_seconds).toBeDefined();
    console.log(
      `  Recovery token received, TTL: ${response.ttl_seconds}s`,
    );
  });
});
