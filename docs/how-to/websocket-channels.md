# How-to: Subscribe to WebSocket Channels

> **Diataxis category:** How-to guide (task-oriented)

## All 16 channels at a glance

### Market Data Channels

| Channel | Required Query | Optional Query | Event Types |
|---------|---------------|----------------|-------------|
| `index_price` | `pair` | — | `index_price` |
| `instruments` | — | `market` | `instruments` |
| `funding` | `instrument_name` | — | `funding` |
| `interest_rate` | `pair` | `expiry` | `interest_rate` |
| `iv` | `pair` | `maturity` | `svi` (not `iv`!) |

### Orderbook Channels

| Channel | Required Query | Optional Query | Event Types |
|---------|---------------|----------------|-------------|
| `orderbook_perps` | — | `instrument_name`, `pair`, `direction`, `skip_snapshot` | `ob_snapshot`, `ob_update`, `post_order`, `cancel_order`, `update_order` |
| `orderbook_options` | — | `instrument_name`, `pair`, `maturity`, `strike`, `type`, `direction`, `skip_snapshot` | Same as perps |
| `orderbook_maker` | `maker` | `pair` | `ob_maker_orders`, `post_order`, `cancel_order` |

### Account Channels

| Channel | Required Query | Optional Query | Event Types |
|---------|---------------|----------------|-------------|
| `account_state` | `account` | `pair` | `account_state` |
| `position` | `account` | `market` | `position` (polled every second) |
| `trade` | — | `account`, `pair`, `direction` | `trade` |
| `transfer` | `account` | `symbol`, `type` | `transfer` |
| `account_liquidation` | `account` | — | NOT YET DELIVERING EVENTS |
| `bankruptcy` | — | `market` | `bankruptcy` |
| `mmp` | — | `smart_account_address`, `pair` | `mmp_triggered` |

### Trading Channels

| Channel | Required Query | Optional Query | Event Types |
|---------|---------------|----------------|-------------|
| `rfq` | — | `account`, `type`, `order_id` | `rfq_request`, `rfq_post_response`, `rfq_cancel_response` |

## Subscribing

```typescript
ws.send(JSON.stringify({
  type: "subscribe",
  channel: "orderbook_perps",
  query: {
    pair: "BTC_USDC",
    skip_snapshot: false, // Get initial snapshot
  },
  id: "sub-1", // Optional: correlate with response
}));
```

## Unsubscribing

```typescript
// Single channel
ws.send(JSON.stringify({
  type: "unsubscribe",
  channel: "orderbook_perps",
  query: { pair: "BTC_USDC" },
}));

// All channels
ws.send(JSON.stringify({ type: "unsubscribe_all" }));
```

## Gotchas

- The `iv` channel sends events with type `"svi"`, not `"iv"` — named after the SVI (Stochastic Volatility Inspired) model
- `account_liquidation` accepts subscriptions but does not currently deliver events
- `position` channel data is polled every second (not event-driven)
- `orderbook_maker` has a unique initial snapshot event: `ob_maker_orders`
- Use `skip_snapshot: true` if you only want incremental updates
