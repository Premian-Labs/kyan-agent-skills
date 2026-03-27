---
name: kyan-trading
description: Place and manage orders on Kyan.blue derivatives exchange via REST API. Covers limit/market/combo orders, cancellations, RFQ block trading, one-click sessions, and dead man's switch heartbeat.
version: 1.0.0
---

# Kyan Trading REST API

This skill provides a typed REST client for the Kyan derivatives exchange. All trading operations go through the `KyanClient` class which handles authentication, headers, and error handling.

## Initializing the Client

```ts
import { KyanClient } from "@kyan-skills/trading";

const client = new KyanClient({
  apiKey: "your-api-key",
  baseUrl: "https://staging.kyan.sh", // optional, this is the default
});
```

The client adds `x-apikey` and `Content-Type: application/json` headers to every request. For one-click session mode, pass `{ oneClickHash: "..." }` as the options parameter to any trading function.

## Authentication Modes

There are two ways to authenticate trading operations:

### Individual Signatures
Every order/cancel/fill requires an EIP-712 signature and deadline:
```ts
await postLimitOrders(client, orders, {
  signature: "0x...",
  signature_deadline: Math.floor(Date.now() / 1000) + 30,
});
```

### One-Click Sessions
Sign once to create a session, then trade without per-order signatures:
```ts
const session = await createSession(client, { signature, signature_deadline });
// Now pass the session hash on all subsequent calls:
await postLimitOrders(client, orders, undefined, { oneClickHash: session.hash });
```
Sessions are valid for 24 hours and auto-refresh when order operations are performed.

## Placing Orders

### Limit Orders — `postLimitOrders()`
```ts
import { postLimitOrders } from "@kyan-skills/trading";

const result = await postLimitOrders(client, [{
  instrument_name: "ETH_USDC-PERPETUAL",
  type: "good_til_cancelled",
  amount: 100,           // dollar-notional for perpetuals
  direction: "buy",
  price: 3200,
  post_only: true,
  mmp: false,
  liquidation: false,
  maker: "0xYourAddress",
  taker: "0x0000000000000000000000000000000000000000",
}], signatureData);
// result.posted — successfully posted orders
// result.rejected — orders rejected with { reason }
```

Key constraints (v1.18.0):
- `taker` is restricted to the zero address only.
- Empty order arrays are rejected.
- `additionalProperties: false` is enforced — do not include extra fields.

### Editing Limit Orders — `editLimitOrder()`

**WARNING (v1.17.0 breaking change):** Editing creates a NEW `order_id`. The original order receives a `CancelOrder` event and the replacement receives a `PostOrder` event. Any code tracking order IDs must handle this change.

```ts
import { editLimitOrder } from "@kyan-skills/trading";

const result = await editLimitOrder(client, "original-order-id", {
  price: 3250,
  amount: 150,
}, signatureData);
// result.posted[0].order_id is a NEW ID, different from "original-order-id"
```

### Market Orders — `postMarketOrder()`
```ts
import { postMarketOrder } from "@kyan-skills/trading";

const result = await postMarketOrder(client, {
  market_order: {
    instrument_name: "BTC_USDC-PERPETUAL",
    amount: 500,
    direction: "buy",
  },
  limit_price: 95000,
  taker: "0xYourAddress",
}, signatureData);
```

### Combo Orders — `postComboOrder()`
Multi-leg orders for structured trades:
```ts
import { postComboOrder } from "@kyan-skills/trading";

const result = await postComboOrder(client, {
  market_orders: [
    { instrument_name: "ETH_USDC-31DEC25-5000-C", contracts: 1, direction: "buy" },
    { instrument_name: "ETH_USDC-31DEC25-6000-C", contracts: 1, direction: "sell" },
  ],
  limit_net_premium: -200,  // negative = net debit (taker pays)
  limit_perp_price: 0,
  taker: "0xYourAddress",
}, signatureData);
```

Premium sign convention:
- Negative `total_net_premium` = net debit (taker pays)
- Positive `total_net_premium` = net credit (taker receives)
- Only options legs contribute to the premium; perpetual legs are excluded.

## Cancelling Orders

### Selective Cancel — `cancelOrders()`
```ts
import { cancelOrders } from "@kyan-skills/trading";

const result = await cancelOrders(client, makerAddress, ["order-1", "order-2"], signatureData);
```

The response has 4 buckets that must all be checked:
- `orders_cancelled` — immediately cancelled
- `orders_pending_cancel` — accepted, will resolve asynchronously
- `rejected_cancellations` — could not be cancelled (e.g. already filled)
- `orders_not_found` — unknown order IDs

Ownership validation prevents cancelling orders you don't own (IDOR protection).

### Cancel All — `cancelAllOrders()`
```ts
import { cancelAllOrders } from "@kyan-skills/trading";

const result = await cancelAllOrders(client, makerAddress, signatureData);
// result.orders_cancelled + result.orders_pending_cancel
```

## RFQ (Request for Quote) Block Trading

The RFQ flow has three steps:

1. **Submit request** — taker describes the legs they want quoted:
   ```ts
   const req = await submitRFQRequest(client, {
     legs: [{ instrument_name: "BTC_USDC-31DEC25-120000-C", contracts: 10, direction: "buy" }],
   });
   ```

2. **Submit response** — market makers provide pricing:
   ```ts
   const resp = await submitRFQResponse(client, {
     request_id: req.request_id,
     legs: [{ instrument_name: "BTC_USDC-31DEC25-120000-C", direction: "sell", price: 5200, contracts: 10 }],
   });
   ```
   **Constraint:** ALL legs must be options OR exactly ONE perpetual. No mixing.

3. **Fill** — taker executes the best quote:
   ```ts
   const fill = await fillRFQ(client, takerAddress, resp.response_id, signatureData);
   ```

Use `getRFQRequests()` and `getRFQResponses()` to poll for active requests and responses.

## Session Management

### Creating Sessions
```ts
import { createSession } from "@kyan-skills/trading";

const session = await createSession(client, {
  signature: sessionSignature,
  signature_deadline: Math.floor(Date.now() / 1000) + 3600,
});
// session.hash — use as x-one-click header value
```

### Revoking Sessions
```ts
import { revokeSession } from "@kyan-skills/trading";

// Revoke a specific session:
await revokeSession(client, session.hash);

// Revoke ALL sessions for this API key:
await revokeSession(client);
```

### Dead Man's Switch — `postHeartbeat()`
```ts
import { postHeartbeat } from "@kyan-skills/trading";

await postHeartbeat(client, makerAddress, 30, signatureData);
// If no heartbeat within 30 seconds, ALL orders are cancelled
```

If the signature deadline is invalid, the server returns a `SIGNATURE_DEADLINE_INVALID` error with `serverTime`, `minTimestamp`, `maxTimestamp`, and `givenTimestamp` to help correct clock skew.

## Rate Limits

| Endpoint Category | Limit               |
|-------------------|----------------------|
| Trading           | 5 requests/second    |
| RFQ               | 6 requests/minute    |
| Market Data       | 20 requests/second   |
| Account           | 2 requests/second    |

HTTP 429 responses throw a `KyanRateLimitError` with a `retryAfterMs` property when available.

## Error Handling

The client throws two error types:
- `KyanRateLimitError` — HTTP 429, includes `retryAfterMs`
- `KyanApiError` — all other non-2xx responses, includes `status` and `body`

### Common Rejection Reasons
- `INSUFFICIENT_MARGIN` — not enough collateral for the trade
- `INVALID_INSTRUMENT` — instrument name does not exist or is expired
- `INVALID_PRICE` — price is outside acceptable bounds
- `POST_ONLY_WOULD_CROSS` — post-only order would immediately match
- `SIGNATURE_DEADLINE_INVALID` — deadline is outside the acceptable window
- `RATE_LIMIT_EXCEEDED` — too many requests in the time window
- `ORDER_NOT_FOUND` — referenced order ID does not exist
- `UNAUTHORIZED` — invalid API key or session hash

## Breaking Changes to Watch

### v1.18.0
- `taker` field on limit orders restricted to zero address only
- Empty order arrays are now rejected (previously returned empty response)
- `additionalProperties: false` enforced on limit order schema

### v1.17.0
- **Editing a limit order now creates a new `order_id`** — the original order gets a `CancelOrder` event and the replacement gets a `PostOrder` event. This is a breaking change for any code that tracks order IDs across edits.

## File Structure

```
kyan-trading/
  src/
    client.ts   — KyanClient class with auth and HTTP methods
    orders.ts   — Limit, market, and combo order functions
    cancel.ts   — Selective and bulk cancel functions
    rfq.ts      — RFQ request/response/fill flow
    session.ts  — One-click sessions and heartbeat
    index.ts    — Re-exports all public API
  examples/
    place-limit-order.ts — Complete example with both auth modes
```
