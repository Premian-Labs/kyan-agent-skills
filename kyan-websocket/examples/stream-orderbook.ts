// ============================================================================
// Example: Stream BTC_USDC Perpetual Orderbook
//
// Connects to Kyan, authenticates, enables session recovery, subscribes to
// the BTC_USDC perpetual orderbook, and maintains a local orderbook state
// from ob_snapshot and ob_update events.
// ============================================================================

import {
  KyanWebSocket,
  enableSessionRecovery,
  recoverSession,
  subscribeOrderbookPerps,
} from "../src";
import type {
  OBSnapshotEvent,
  OBUpdateEvent,
  PostOrderEvent,
  CancelOrderEvent,
  UpdateOrderEvent,
} from "../src";

// ---------------------------------------------------------------------------
// Local orderbook state
// ---------------------------------------------------------------------------

interface OrderbookOrder {
  order_id: string;
  maker: string;
  amount: string;
  limit_price: string;
}

interface LocalOrderbook {
  instrument_name: string;
  bids: Map<string, OrderbookOrder>; // order_id -> order
  asks: Map<string, OrderbookOrder>; // order_id -> order
}

const orderbook: LocalOrderbook = {
  instrument_name: "",
  bids: new Map(),
  asks: new Map(),
};

function applySnapshot(event: OBSnapshotEvent): void {
  orderbook.instrument_name = event.instrument_name;
  orderbook.bids.clear();
  orderbook.asks.clear();

  for (const bid of event.bids) {
    orderbook.bids.set(bid.order_id, bid);
  }
  for (const ask of event.asks) {
    orderbook.asks.set(ask.order_id, ask);
  }

  console.log(
    `[Snapshot] ${orderbook.instrument_name}: ${orderbook.bids.size} bids, ${orderbook.asks.size} asks`,
  );
}

function applyUpdate(event: OBUpdateEvent): void {
  for (const bid of event.bids) {
    orderbook.bids.set(bid.order_id, bid);
  }
  for (const ask of event.asks) {
    orderbook.asks.set(ask.order_id, ask);
  }
}

function handlePostOrder(event: PostOrderEvent): void {
  const side = event.direction === "buy" ? orderbook.bids : orderbook.asks;
  side.set(event.order_id, {
    order_id: event.order_id,
    maker: event.maker,
    amount: event.amount,
    limit_price: event.limit_price,
  });
  console.log(`[PostOrder] ${event.direction} ${event.amount} @ ${event.limit_price}`);
}

function handleCancelOrder(event: CancelOrderEvent): void {
  orderbook.bids.delete(event.order_id);
  orderbook.asks.delete(event.order_id);
  console.log(`[CancelOrder] ${event.order_id}`);
}

function handleUpdateOrder(event: UpdateOrderEvent): void {
  // Update filled amount — check both sides
  const existing = orderbook.bids.get(event.order_id) ?? orderbook.asks.get(event.order_id);
  if (existing) {
    existing.amount = event.amount;
  }
  console.log(`[UpdateOrder] ${event.order_id} filled=${event.filled_amount} remaining=${event.amount}`);
}

function printTopOfBook(): void {
  const bids = Array.from(orderbook.bids.values())
    .sort((a, b) => parseFloat(b.limit_price) - parseFloat(a.limit_price))
    .slice(0, 5);

  const asks = Array.from(orderbook.asks.values())
    .sort((a, b) => parseFloat(a.limit_price) - parseFloat(b.limit_price))
    .slice(0, 5);

  console.log("\n--- Top of Book ---");
  console.log("ASKS:");
  for (const ask of asks.reverse()) {
    console.log(`  ${ask.limit_price}  |  ${ask.amount}`);
  }
  console.log("---");
  console.log("BIDS:");
  for (const bid of bids) {
    console.log(`  ${bid.limit_price}  |  ${bid.amount}`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.KYAN_API_KEY;
  if (!apiKey) {
    console.error("Set KYAN_API_KEY environment variable");
    process.exit(1);
  }

  const ws = new KyanWebSocket({
    apiKey,
    onError: (err) => console.error("[WS Error]", err.message),
    onClose: (code, reason) => console.log(`[WS Closed] code=${code} reason=${reason}`),
    autoReconnect: true,
  });

  // Connect and authenticate
  console.log("Connecting to Kyan...");
  await ws.connect();
  console.log("Authenticated.");

  // Enable session recovery
  const recovery = await enableSessionRecovery(ws);
  console.log(`Session recovery enabled (TTL: ${recovery.ttl_seconds}s)`);

  // Store recovery token for reconnection
  let recoveryToken = recovery.recovery_token;

  // Handle reconnection with session recovery
  ws.on("reconnected", async () => {
    try {
      const result = await recoverSession(ws, recoveryToken);
      console.log(
        `Session recovered: ${result.subscriptions_restored} subs restored, ${result.messages_replayed} msgs replayed`,
      );
      // Re-enable session recovery for next disconnect
      const newRecovery = await enableSessionRecovery(ws);
      recoveryToken = newRecovery.recovery_token;
    } catch (err) {
      console.error("Session recovery failed, re-subscribing manually...");
      await subscribeOrderbookPerps(ws, { pair: "BTC_USDC" });
    }
  });

  // Register event handlers
  ws.on("ob_snapshot", (event: OBSnapshotEvent) => {
    applySnapshot(event);
    printTopOfBook();
  });

  ws.on("ob_update", (event: OBUpdateEvent) => {
    applyUpdate(event);
  });

  ws.on("post_order", (event: PostOrderEvent) => {
    handlePostOrder(event);
    printTopOfBook();
  });

  ws.on("cancel_order", (event: CancelOrderEvent) => {
    handleCancelOrder(event);
  });

  ws.on("update_order", (event: UpdateOrderEvent) => {
    handleUpdateOrder(event);
  });

  // Detect sequence gaps
  ws.on("sequence_gap", (info: { expected: number; received: number; gap: number }) => {
    console.warn(`Sequence gap: expected ${info.expected}, got ${info.received} (missed ${info.gap})`);
  });

  // Subscribe to BTC_USDC perpetual orderbook
  console.log("Subscribing to BTC_USDC perpetual orderbook...");
  await subscribeOrderbookPerps(ws, { pair: "BTC_USDC" });
  console.log("Subscribed. Waiting for events...\n");

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("\nClosing connection...");
    ws.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
