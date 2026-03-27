---
name: kyan-account
description: Manage accounts, collateral, and risk on Kyan.blue derivatives exchange. Portfolio state with Greeks, margin calculations, deposit/withdraw/transfer, and market maker protection.
version: 1.0.0
---

# kyan-account

Account management, collateral operations, risk monitoring, and market maker protection for the Kyan.blue derivatives exchange.

## Account State

The exchange supports **multi-account portfolios** with separate margin accounts per trading pair (BTC_USDC, ETH_USDC, ARB_USDC).

`getAccountState(client, account)` returns an `AccountState` with `margin_accounts[]`, each containing:

- **Margin metrics**: `im` (initial margin), `mm` (maintenance margin), `matrix_risk`, `delta_risk`, `roll_risk`
- **Financials**: `margin_account` (collateral balance), `unrealised_pnl`, `equity`
- **Portfolio Greeks**: `delta`, `gamma`, `vega`, `theta`, `rho` at the account level
- **Positions[]**: each with `instrument_type` (option/perpetual), `instrument` name, `size`, `average_price`, `entry_fees`, `mark_price`, `mark_iv`, `mark_interest`, and position-level `position_greeks`

Margin utilization is `im / equity`. Liquidation warning when `equity` approaches `mm`.

## Account History (v2 Beta)

`getAccountHistory(client, params?)` uses **cursor-based pagination**:

- Pass `next_cursor` from previous response as `cursor` for the next page
- Filter by `event_types` (deposit, withdraw, transfer, trade, settlement, liquidation, funding, fee)
- Filter by `actions` (open, close, increase, decrease)
- Filter by `markets` (trading pairs) and `transfer_type` (deposit, withdrawal, internal)
- Sort with `sortKey` (timestamp, id) and `sortOrder` (asc, desc)
- Events carry **second-based timestamps** and a unique `id`

## Positions

`getPositions(client)` returns all margin accounts with their current holdings.

## Collateral Operations

USDC is the **primary collateral** with **6 decimal precision**.

- `deposit(client, amount, pair, signatureData?)` — POST /deposit
- `withdraw(client, amount, pair, signatureData?)` — POST /withdraw
- `transfer(client, amount, fromPair, toPair, signatureData?)` — POST /transfer (move between margin accounts)

### Deposit Errors

- `DEPOSIT_LIMIT_EXCEEDED`: response includes `limit`, `currentTotal`, and `requested` fields
- `ACCOUNT_LIMIT_REACHED`: maximum number of margin accounts already exist

Withdrawals are rejected if removing collateral would drop the account below maintenance margin.

## Portfolio Margin Model

Kyan uses a **portfolio margin system** that evaluates positions holistically. Three additive risk components determine the base margin:

1. **Matrix Risk** — Stress-test across scenarios combining price movements (up/down fixed %) with implied volatility shifts. Worst-case portfolio loss = matrix risk charge.
2. **Delta Risk** — Additional charge for large directional exposures not fully captured by matrix scenarios.
3. **Roll Risk** — Extra charge for near-expiry options to cover gamma/pin risk approaching expiration.

### Margin Thresholds

- **Initial Margin (IM)** = matrix_risk + delta_risk + roll_risk. Required to open/increase positions.
- **Maintenance Margin (MM)** = IM * 1.2. Minimum to keep positions open.

### Liquidation

Triggered when **equity < maintenance margin (MM)**. The liquidation engine closes positions to restore the account above MM. Liquidation trades incur higher fees (see fee schedule).

### Pricing

- Options: **Black-Scholes** with **SVI volatility surface**
- Underlying prices: **Chainlink oracles**
- Mark prices drive margin calculations, unrealised PnL, and Greeks

## Risk Calculation

`calculateUserRisk(client, portfolio)` evaluates a hypothetical set of positions:

- Input: `pair` + `positions[]` each with `instrument_name`, `size`, `direction`
- Output: aggregate `im`, `mm`, `matrix_risk`, `delta_risk`, `roll_risk`, `portfolio_greeks`
- **Settlement projections** (`future_settlement_projections[]`): per settlement date, shows projected IM, MM, risk components, and Greeks. Useful for understanding how margin evolves across upcoming expirations.

Use this to preview margin impact before placing trades.

## Market Maker Protection (MMP)

MMP auto-freezes quoting when risk limits are breached within a rolling time window.

- `getMMPConfig(client, pair)` — current config
- `setMMPConfig(client, config, signatureData)` — update config (requires EIP-712 signature)

### EIP-712 Signature Fields (6 signed fields)

1. `smartAccountAddress`
2. `pairSymbol`
3. `status`
4. `interval`
5. `frozenTime`
6. `deadline`

### Unsigned Body Fields

These risk limits are in the request body but **NOT** included in the EIP-712 signature:

- `quantityLimit` — max net quantity change in the interval
- `deltaLimit` — max net delta change in the interval
- `vegaLimit` — max net vega change in the interval

Status is either `"active"` or `"frozen"`. The `interval` (seconds) defines the rolling window, and `frozen_time` (seconds) sets how long the account stays frozen after a breach.

## Fee Schedule Reference

### Perpetuals

| Pair      | Maker | Taker  | Liquidation |
|-----------|-------|--------|-------------|
| BTC_USDC  | 0%    | 0.08%  | 0.15%       |
| ETH_USDC  | 0%    | 0.08%  | 0.15%       |
| ARB_USDC  | 0%    | 0.08%  | 0.25%       |

### Options

| Pair      | Maker  | Taker  | Liquidation |
|-----------|--------|--------|-------------|
| BTC_USDC  | 0.04%  | 0.04%  | 0.19%       |
| ETH_USDC  | 0.04%  | 0.04%  | 0.19%       |
| ARB_USDC  | 0.08%  | 0.08%  | 0.19%       |

- Delivery fee: 0.02%
- Systemic risk fee: 0.0025%

## API Endpoints

| Function               | Method | Path                   |
|------------------------|--------|------------------------|
| getAccountState        | GET    | /account-state         |
| getAccountHistory      | GET    | /v2/account-history    |
| getPositions           | GET    | /positions             |
| deposit                | POST   | /deposit               |
| withdraw               | POST   | /withdraw              |
| transfer               | POST   | /transfer              |
| calculateUserRisk      | POST   | /calculate-user-risk   |
| getMMPConfig           | GET    | /mmp-config            |
| setMMPConfig           | POST   | /mmp-config            |

## Key Constants

- USDC decimals: 6
- MM multiplier: 1.2x base requirement
- Account rate limit: 2 requests/second
