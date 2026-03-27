---
name: kyan-websocket
description: Build real-time WebSocket streaming clients for Kyan.blue derivatives exchange. Covers 16 channels (market data, orderbook, account, trading), session recovery, and reconnection with exponential backoff.
version: 1.0.0
---

# Kyan WebSocket Skill

Build real-time streaming clients for the Kyan derivatives exchange WebSocket API.

## WebSocket Lifecycle

The connection lifecycle follows a strict sequence:

```
connect() -> auth -> subscribe -> handle messages
```

1. **Connect** to `wss://staging.kyan.sh/ws` (or production URL)
2. **Authenticate** immediately on open by sending an `auth` message with `api_key`
3. **Subscribe** to channels with optional query filters
4. **Handle** incoming events routed by `type` field

Auth uses an API key only. No EIP-712 signature is needed for WebSocket connections (unlike the REST API).

There is NO WebSocket-level ping/pong. The server may drop connections at any time. Use auto-reconnect and session recovery to handle this.

## Server Message Envelope

Every message from the server has this structure:

```typescript
{
  kind: "response" | "event",  // "response" for request replies, "event" for pushes
  type: string,                // message type (e.g. "ob_snapshot", "trade", "auth")
  timestamp_ms: number,        // server timestamp in ms
  message_id?: string,         // unique ID for resend requests
  seq_id?: number,             // monotonic sequence number for gap detection
  id?: string,                 // correlation ID echoed from client request
  success?: boolean,           // present on responses
  error?: string               // present when success is false
}
```

## Client Commands

### subscribe / unsubscribe

```typescript
ws.subscribe("orderbook_perps", { pair: "BTC_USDC" });
ws.unsubscribe("orderbook_perps", { pair: "BTC_USDC" });
ws.unsubscribeAll();
```

### get_subscriptions

Returns the list of active channel subscriptions.

### get_instruments

Returns all available instruments.

### get_ob_state_by_instruments / get_ob_state_by_market

Fetch current orderbook state on demand (not a subscription).

### resend

Request re-delivery of a specific message by its `message_id`.

## The 16 Channels

### Market Data Channels

| Channel | Query | Event Type(s) | Notes |
|---------|-------|---------------|-------|
| `index_price` | `{ pair }` | `index_price` | Real-time index price |
| `instruments` | `{ market? }` | `instruments` | Instrument listings |
| `funding` | `{ instrument_name }` | `funding` | Funding rate for perps |
| `interest_rate` | `{ pair, expiry? }` | `interest_rate` | Interest rate data |
| `iv` | `{ pair, maturity? }` | `svi` | **Event type is "svi", NOT "iv"** |

### Orderbook Channels

| Channel | Query | Event Type(s) | Notes |
|---------|-------|---------------|-------|
| `orderbook_perps` | `{ instrument_name?, pair?, direction?, skip_snapshot? }` | `ob_snapshot`, `ob_update`, `post_order`, `cancel_order`, `update_order` | Perpetual orderbook |
| `orderbook_options` | `{ instrument_name?, pair?, maturity?, strike?, type?, direction?, skip_snapshot? }` | `ob_snapshot`, `ob_update`, `post_order`, `cancel_order`, `update_order` | Options orderbook |
| `orderbook_maker` | `{ maker, pair? }` | `ob_maker_orders` | Unique maker-specific snapshot |

### Account Channels

| Channel | Query | Event Type(s) | Notes |
|---------|-------|---------------|-------|
| `account_state` | `{ account, pair? }` | `account_state` | Margin/collateral state |
| `position` | `{ account, market? }` | `position` | Polled every second by server |
| `transfer` | `{ account, symbol?, type? }` | `transfer` | Deposits/withdrawals |
| `account_liquidation` | `{ account }` | N/A | **NOT YET DELIVERING EVENTS** |

### Trading Channels

| Channel | Query | Event Type(s) | Notes |
|---------|-------|---------------|-------|
| `trade` | `{ account?, pair?, direction? }` | `trade` | All fields optional |
| `bankruptcy` | `{ market? }` | `bankruptcy` | Market bankruptcy events |
| `mmp` | `{ smart_account_address?, pair? }` | `mmp_triggered` | Market Maker Protection |
| `rfq` | `{ account?, type?, order_id? }` | `rfq_request`, `rfq_post_response`, `rfq_cancel_response` | Request For Quote |

## Important Gotchas

- **iv channel**: Subscribe to channel `"iv"` but events arrive with type `"svi"`, not `"iv"`. Register your handler on `ws.on("svi", ...)`.
- **account_liquidation**: This channel exists in the API but is NOT YET DELIVERING EVENTS. Subscriptions will succeed but no events will be received.
- **position channel**: The server polls positions every second. Events arrive at ~1Hz, not on every state change.
- **No ping/pong**: The server does not implement WebSocket ping/pong frames. Connections can be dropped at any time without warning.

## Session Recovery Protocol

Session recovery allows restoring subscriptions and replaying missed messages after a disconnection.

### Flow

```typescript
// 1. Enable recovery after auth
const { recovery_token, ttl_seconds } = await enableSessionRecovery(ws);
// ttl_seconds defaults to 30

// 2. Store the token for later

// 3. On disconnect, reconnect within ttl_seconds
const ws2 = new KyanWebSocket({ apiKey });
await ws2.connect();

// 4. Recover instead of re-subscribing
const result = await recoverSession(ws2, recovery_token);
// result: { success, subscriptions_restored, messages_replayed }
```

### Behavior

- **30-second recovery window** (default TTL): must reconnect and send `recover_session` within this window
- **Up to 1000 messages buffered**: the server holds messages during disconnection
- **All subscriptions restored**: no need to re-subscribe to channels
- **Sequence continuity**: `seq_id` numbers continue from where they left off, so gap detection works across recovery boundaries

## Reconnection Strategy

The client implements auto-reconnection with exponential backoff:

- **Max attempts**: 5
- **Initial interval**: 1 second
- **Max interval**: 30 seconds
- **Backoff formula**: `min(1000 * 2^attempt, 30000)` milliseconds
- **Intervals**: 1s, 2s, 4s, 8s, 16s (capped at 30s)

On successful reconnect, use session recovery to restore state. If recovery fails (token expired), re-subscribe to channels manually.

## Rate Limits

WebSocket messages are rate-limited per message type. The server will return an error response if rate limits are exceeded. Back off and retry with appropriate delays.

## Sequence Gap Detection

Every event message includes a `seq_id` that increases monotonically. If a gap is detected (received seq_id > last_seq_id + 1), the client emits a `sequence_gap` event. Use the `resend` command with the `message_id` to request re-delivery of specific missed messages.

## Usage Example

```typescript
import { KyanWebSocket, subscribeOrderbookPerps, enableSessionRecovery } from "@kyan-skills/websocket";

const ws = new KyanWebSocket({ apiKey: process.env.KYAN_API_KEY! });
await ws.connect();

// Enable session recovery
const { recovery_token } = await enableSessionRecovery(ws);

// Subscribe to BTC perp orderbook
await subscribeOrderbookPerps(ws, { pair: "BTC_USDC" });

// Handle events
ws.on("ob_snapshot", (event) => {
  console.log("Full book:", event.bids.length, "bids,", event.asks.length, "asks");
});

ws.on("post_order", (event) => {
  console.log("New order:", event.direction, event.amount, "@", event.limit_price);
});

ws.on("trade", (event) => {
  console.log("Trade:", event.amount, "@", event.price);
});

// Clean shutdown
process.on("SIGINT", () => ws.close());
```

## File Structure

```
kyan-websocket/
  src/
    types.ts     — All message types, query interfaces, event types
    client.ts    — KyanWebSocket class with connection, auth, subscriptions
    channels.ts  — Typed helpers for each of the 16 channels
    recovery.ts  — Session recovery enable/recover functions
    index.ts     — Re-exports everything
  examples/
    stream-orderbook.ts — Complete working example
```
