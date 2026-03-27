# Reference: WebSocket Message Types

> **Diataxis category:** Reference (information-oriented)

## Server Message Envelope

Every message from the server follows this structure:

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"response"` \| `"event"` | Response to your request, or unsolicited event |
| `type` | `string` | Event/response type identifier |
| `timestamp_ms` | `number` | Server timestamp in milliseconds |
| `message_id` | `string?` | Unique message ID (for resend requests) |
| `seq_id` | `number?` | Sequence number (for gap detection) |
| `id` | `string?` | Your request correlation ID (responses only) |
| `success` | `boolean?` | Whether the request succeeded (responses only) |
| `error` | `string?` | Error message (failed responses only) |

## Authentication

### Request
```json
{ "type": "auth", "api_key": "your_key", "id": "optional" }
```

### Response
```json
{ "kind": "response", "type": "auth", "success": true }
```

### Error Codes
| Code | Meaning |
|------|---------|
| `NOT_FOUND` | API key does not exist |
| `FORBIDDEN` | API key is disabled |
| `KEY_USAGE_EXCEEDED` | Usage limit reached |
| `RATELIMITED` | Too many requests |
| `Session already authorized` | Already authenticated |

## Commands

| Command | Description | Returns |
|---------|-------------|---------|
| `subscribe` | Subscribe to a channel | Confirmation or error |
| `unsubscribe` | Unsubscribe from a channel | Confirmation |
| `unsubscribe_all` | Unsubscribe from all channels | Confirmation |
| `get_subscriptions` | List active subscriptions | Subscription list |
| `get_instruments` | Get available instruments | Instrument list |
| `get_ob_state_by_instruments` | Orderbook state for specific instruments | Orderbook data |
| `get_ob_state_by_market` | Orderbook state for a market | Orderbook data |
| `resend` | Re-request a message by ID | Re-delivered message |
| `enable_session_recovery` | Activate recovery | `{ recovery_token, ttl_seconds }` |
| `recover_session` | Restore session | Replayed messages + restored subscriptions |

## Rate Limits (WebSocket)

| Message Type | Limit |
|-------------|-------|
| `auth` | 5/second |
| `subscribe` | 20/second |
| `unsubscribe` | 20/second |
| `unsubscribe_all` | 5/second |
| `get_subscriptions` | 5/second |
| `get_instruments` | 5/second |
| `get_ob_state_by_instruments` | 5/second |
| `get_ob_state_by_market` | 5/second |
| `resend` | 5/second |
| `enable_session_recovery` | 2/second |

## Orderbook Events

| Event Type | Description |
|-----------|-------------|
| `ob_snapshot` | Full orderbook state (sent on subscribe) |
| `ob_update` | Incremental price level update |
| `post_order` | New order placed |
| `cancel_order` | Order cancelled |
| `update_order` | Order state change (partial fill) |
| `ob_maker_orders` | Maker's orders snapshot (orderbook_maker channel only) |

## Session Recovery

| Step | Message | Key Fields |
|------|---------|------------|
| Enable | `{ type: "enable_session_recovery" }` | Response: `recovery_token`, `ttl_seconds` (default 30) |
| Recover | `{ type: "recover_session", recovery_token: "..." }` | Replays up to 1000 buffered messages |

Recovery window: 30 seconds. Buffer limit: 1000 messages. Sequence numbers continue from where they left off.

## See also

- [Tutorial: Streaming Market Data](../tutorials/02-websocket-streaming.md)
- [How-to: WebSocket Channel Subscriptions](../how-to/websocket-channels.md)
- [Reference: Contract Addresses and Endpoints](./contract-addresses.md)
