# Tutorial: Streaming Market Data with WebSockets

> **Diataxis category:** Tutorial (learning-oriented)
> **Time:** ~10 minutes
> **Prerequisites:** Kyan API key, completed Tutorial 01

## What you'll learn

1. Connect to Kyan's WebSocket API
2. Authenticate your session
3. Subscribe to real-time orderbook data
4. Handle orderbook events (snapshots and updates)

## Step 1: Connect and authenticate

```typescript
const ws = new WebSocket("wss://staging.kyan.sh/ws");

ws.onopen = () => {
  // Authenticate immediately after connecting
  ws.send(JSON.stringify({
    type: "auth",
    api_key: process.env.KYAN_API_KEY,
    id: "auth-1",
  }));
};
```

Authentication notes:
- API key must match pattern `^[a-zA-Z0-9_]+$`
- You MUST authenticate before subscribing to any channel
- No EIP-712 signature needed for WebSocket auth (unlike REST trading)

## Step 2: Subscribe to the orderbook

After receiving a successful auth response, subscribe to the perpetuals orderbook:

```typescript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  // Handle auth response
  if (msg.type === "auth" && msg.success) {
    console.log("Authenticated!");

    ws.send(JSON.stringify({
      type: "subscribe",
      channel: "orderbook_perps",
      query: { pair: "BTC_USDC" },
      id: "sub-ob-1",
    }));
    return;
  }

  // Handle subscription confirmation
  if (msg.type === "subscribe" && msg.success) {
    console.log("Subscribed to orderbook");
    return;
  }

  // Handle orderbook events
  switch (msg.type) {
    case "ob_snapshot":
      console.log("Full orderbook snapshot received");
      // Initialize local orderbook state
      break;
    case "ob_update":
      console.log("Orderbook update:", msg);
      // Apply incremental update to local state
      break;
    case "post_order":
      console.log("New order posted:", msg);
      break;
    case "cancel_order":
      console.log("Order cancelled:", msg);
      break;
    case "update_order":
      console.log("Order updated (fill):", msg);
      break;
  }
};
```

## Step 3: Enable session recovery

Session recovery lets you reconnect without losing messages (30-second window, 1000 message buffer):

```typescript
// After auth success, enable recovery
ws.send(JSON.stringify({
  type: "enable_session_recovery",
  id: "recovery-1",
}));

// Response includes: { recovery_token, ttl_seconds }
// Store the recovery_token for reconnection
```

If disconnected, reconnect and recover:

```typescript
const reconnectWs = new WebSocket("wss://staging.kyan.sh/ws");

reconnectWs.onopen = () => {
  reconnectWs.send(JSON.stringify({
    type: "recover_session",
    recovery_token: savedRecoveryToken,
    id: "recover-1",
  }));
  // Server replays missed messages and restores subscriptions
};
```

## Step 4: Handle disconnections

There is NO WebSocket-level ping/pong. The server may drop connections at any time. Implement reconnection with exponential backoff:

```typescript
let reconnectAttempts = 0;
const MAX_ATTEMPTS = 5;
const INITIAL_INTERVAL = 1000;
const MAX_INTERVAL = 30000;

ws.onclose = () => {
  if (reconnectAttempts < MAX_ATTEMPTS) {
    const delay = Math.min(
      INITIAL_INTERVAL * Math.pow(2, reconnectAttempts),
      MAX_INTERVAL
    );
    reconnectAttempts++;
    setTimeout(() => connect(), delay);
  }
};
```

## What's next?

- [How-to: Subscribe to all 16 channels](../how-to/websocket-channels.md)
- [Reference: WebSocket message types](../reference/websocket-events.md)
- [Explanation: Portfolio margin model](../explanation/margin-model.md)
