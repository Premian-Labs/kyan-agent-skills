# How-to: Run Integration Tests

> **Diataxis category:** How-to guide (task-oriented)

## Problem

You want to verify the skills work against the real Kyan staging API, not just unit test mocks.

## Prerequisites

- Node.js 18+
- `npm install` completed
- A Kyan API key (from the Premia team)
- For signing tests: a testnet wallet private key on Arbitrum Sepolia

## Environment variables

Create a `.env` file (or export directly):

```bash
# Required for all integration tests
export KYAN_API_KEY=your_api_key_here

# Required for signing/trading tests
export WALLET_PRIVATE_KEY=your_private_key_no_0x_prefix

# Optional — defaults to Arbitrum Sepolia testnet address
export CLEARING_HOUSE_PROXY=0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0
```

## Running the tests

```bash
# Unit tests only (no credentials needed)
npm test

# Integration tests only (requires KYAN_API_KEY at minimum)
npm run test:integration

# All tests (unit + integration)
npm run test:all

# Watch mode (re-runs on file changes)
npm run test:watch
```

## What the integration tests cover

### `integration/rest-api.integration.test.ts` (requires `KYAN_API_KEY`)
- GET /exchange-info returns metadata
- GET /instruments returns active instruments with correct naming
- GET /expirations returns settlement dates
- GET /index-price returns underlying prices
- GET /order_book returns orderbook data
- GET /orders returns open orders
- Rate limit verification (5 rapid calls stay under limit)
- ClearingHouseProxy address discovery from exchange-info

### `integration/websocket.integration.test.ts` (requires `KYAN_API_KEY`)
- WebSocket connects and authenticates
- Invalid API key is rejected
- index_price subscription receives live data
- instruments subscription receives data
- orderbook_perps subscription receives snapshots
- get_instruments command works
- unsubscribe_all works
- Session recovery returns a recovery token

### `integration/signing.integration.test.ts` (requires `KYAN_API_KEY` + `WALLET_PRIVATE_KEY`)
- EIP-712 limit order signature generation
- One-click session signature generation
- Live order submission to staging (uses $1 price — won't fill)
- Cancel all orders via signed request
- One-click session create and revoke

## Safety notes

- All tests target the **staging** environment, never production
- Order submissions use absurd prices ($1 for BTC) that will never fill
- Sessions are created and immediately revoked
- Use a **testnet wallet** with testnet USDC only

## See also

- [Reference: Contract Addresses and Endpoints](../reference/contract-addresses.md)
- [Tutorial: Your First Trade](../tutorials/01-first-trade.md)
