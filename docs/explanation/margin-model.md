# Explanation: Portfolio Margin Model

> **Diataxis category:** Explanation (understanding-oriented)

## Why portfolio margin?

Kyan uses a portfolio margin system rather than isolated margin. This means your entire portfolio of positions within a trading pair is evaluated together, allowing hedged positions to offset each other's risk requirements. A short call and a long call at different strikes require less margin together than the sum of their individual requirements.

## The five risk components

### 1. Initial Margin (IM)

The collateral required to open a new position. IM is calculated by stress-testing your portfolio against a matrix of scenarios that combine price movements with volatility shifts. It answers: "What's the worst-case loss across all plausible scenarios?"

### 2. Maintenance Margin (MM)

The minimum collateral to keep positions open. MM = 1.2x the base margin requirement. When your account equity falls below MM, liquidation begins.

**Liquidation trigger:** `equity < maintenance margin`

### 3. Matrix Risk

The core risk calculation. Your portfolio is evaluated against a grid of stress scenarios:
- Price moves up and down by various percentages
- Implied volatility shifts up and down simultaneously
- The worst-case P&L across all scenarios determines the matrix risk

This is why hedged positions are capital-efficient — a bull spread loses less in any scenario than a naked long call.

### 4. Delta Risk

An additional margin charge for large directional exposures. Even if your matrix risk is low, a heavily delta-biased portfolio faces gap risk that discrete stress scenarios might miss.

### 5. Roll Risk

Extra margin charged for options approaching expiration. Near-expiry options exhibit extreme gamma (price sensitivity acceleration), which makes their risk profile unstable. Roll risk incentivizes closing or rolling positions before expiry.

## How it all fits together

```
Total Margin = Matrix Risk + Delta Risk + Roll Risk
IM = Total Margin
MM = Total Margin × 1.2
```

Your account is healthy when: `equity >= IM` (can open new positions) or at minimum `equity >= MM` (positions remain open).

## Pricing inputs

- **Implied volatility:** Black-Scholes model with SVI (Stochastic Volatility Inspired) surface. The SVI model ensures a smooth, arbitrage-free volatility smile across strikes.
- **Price feeds:** Chainlink oracles on Arbitrum provide the underlying asset prices.
- **Greeks:** Delta, gamma, vega, theta, and rho are computed per position and aggregated at the portfolio level.

## Perpetuals funding

Perpetual futures use an hourly funding mechanism to anchor the perp price to the index:

```
Premium Index = (Perpetual Price - Index Price) / Index Price
Funding Rate = clamp(Premium Index × 0.9, -1.0%, +1.0%)
```

- Settlement: every hour (00:00, 01:00, ..., 23:00 UTC)
- Payment: Position Size × Time-Weighted Average Rate
- If the perp trades above spot, longs pay shorts (and vice versa)

## Collateral

- Primary collateral: USDC (6-decimal precision)
- Each trading pair has its own margin account
- Collateral can be transferred between pair accounts via `POST /transfer`
- Arbitrum Sepolia testnet USDC: `0x07a7D6b723d0aa62cD78da00452Ba3cD3b72C3d7`
