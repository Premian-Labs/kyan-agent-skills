# Reference: REST API Endpoints

> **Diataxis category:** Reference (information-oriented)

## Base URLs

| Environment | URL |
|-------------|-----|
| Staging | `https://staging.kyan.sh` |
| Production | `https://api.kyan.blue` |

## Authentication

All requests require the `x-apikey` header. Trading operations additionally need either:
- EIP-712 signature fields (`signature`, `signature_deadline`) in the request body, OR
- `x-one-click` session header

## Rate Limits

| Category | Limit |
|----------|-------|
| Market Data | 20 requests/second |
| Trading Operations | 5 requests/second |
| Account Operations | 2 requests/second |
| RFQ Endpoints | 6 requests/minute |

Exceeding limits returns HTTP 429.

## Market Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exchange-info` | Exchange metadata and capabilities |
| GET | `/instruments` | Active tradable instruments |
| GET | `/expirations` | Available settlement dates |
| GET | `/index-price` | Current underlying prices |
| GET | `/order_book` | Order book snapshots by pair |
| GET | `/options-chain` | Options market data with Greeks |
| GET | `/trades-history` | Historical trade data by instrument |

## Trading

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/limit` | Place limit orders | Array of orders. Empty array rejected (v1.18.0). `taker` restricted to zero address. `additionalProperties: false` enforced. |
| PATCH | `/limit` | Edit limit orders | Creates NEW order_id (v1.17.0). Original gets CancelOrder event. |
| POST | `/market` | Execute market orders | With limit price protection |
| POST | `/combo` | Multi-leg combo trades | `total_net_premium`: negative = debit. Options only contribute to premium. |
| DELETE | `/orders` | Cancel specific orders | 4-bucket response: `orders_cancelled`, `orders_pending_cancel`, `rejected_cancellations`, `orders_not_found` |
| DELETE | `/orders_all` | Cancel all maker orders | Response: `orders_cancelled`, `orders_pending_cancel` |
| GET | `/orders` | Retrieve open orders | Inflight orders visible with `filled_amount: 0` |

## RFQ (Block Trading)

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/rfq/request` | Submit RFQ | |
| GET | `/rfq/requests` | Retrieve active RFQs | |
| POST | `/rfq/response` | Quote an RFQ | ALL options OR exactly ONE perpetual |
| GET | `/rfq/responses` | Retrieve quotes | |
| POST | `/rfq/fill` | Execute RFQ | Requires FillRFQType signature |

## Sessions

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/session` | Create one-click session | Returns `{ hash }`. Valid 24 hours. |
| DELETE | `/session` | Revoke session(s) | With `x-one-click`: revokes that session. Without: revokes all. Returns `{ revokedSessions }`. |

## Account

| Method | Path | Description |
|--------|------|-------------|
| GET | `/account-state` | Multi-account portfolio snapshot with Greeks |
| GET | `/account-history` | Legacy format (millisecond timestamps) |
| GET | `/v2/account-history` | Beta: cursor pagination, event filtering, second-based timestamps |
| GET | `/positions` | All margin accounts with holdings |
| POST | `/calculate-user-risk` | Risk metrics with settlement projections |

## Collateral

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/deposit` | Add USDC to margin | Errors: `DEPOSIT_LIMIT_EXCEEDED`, `ACCOUNT_LIMIT_REACHED` |
| POST | `/withdraw` | Remove USDC from margin | |
| POST | `/transfer` | Move between accounts | |

## Market Maker Protection

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| GET | `/mmp-config` | Get MMP config for pair | |
| POST | `/mmp-config` | Set MMP config | Risk limits (quantity, delta, vega) NOT signed |

## Heartbeat (Dead Man's Switch)

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/heartbeat` | Ping to prevent auto-cancel | Error `SIGNATURE_DEADLINE_INVALID` includes `serverTime`, `minTimestamp`, `maxTimestamp` |

## See also

- [Tutorial: Your First Trade](../tutorials/01-first-trade.md)
- [How-to: One-Click Trading Sessions](../how-to/one-click-sessions.md)
- [Reference: EIP-712 Signature Types](./eip712-signatures.md)
- [Reference: Contract Addresses and Endpoints](./contract-addresses.md)
- [Explanation: Authentication Methods](../explanation/authentication-methods.md)
