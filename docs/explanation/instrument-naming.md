# Explanation: Instrument Naming Conventions

> **Diataxis category:** Explanation (understanding-oriented)

## Why structured instrument names?

Every tradable instrument on Kyan has a deterministic name that encodes all its key properties. This means you can parse any instrument name to understand exactly what you're trading, and construct instrument names programmatically.

## Trading pairs

Kyan supports three base pairs, all quoted in USDC:

| Pair | Base Asset | Quote Asset |
|------|-----------|-------------|
| `BTC_USDC` | Bitcoin | USDC |
| `ETH_USDC` | Ethereum | USDC |
| `ARB_USDC` | Arbitrum | USDC |

## Perpetual futures

Format: `{PAIR}-PERPETUAL`

Examples:
- `BTC_USDC-PERPETUAL`
- `ETH_USDC-PERPETUAL`
- `ARB_USDC-PERPETUAL`

Perpetual size is denominated in **dollar-notional** (e.g., `10000` means $10,000 worth, not 10,000 BTC).

## Options

Format: `{PAIR}-{MATURITY}-{STRIKE}-{TYPE}`

| Component | Format | Example |
|-----------|--------|---------|
| Pair | `BASE_QUOTE` | `BTC_USDC` |
| Maturity | `DDMMMYY` | `31OCT25` |
| Strike | Integer or ARB decimal | `106000`, `1d250` |
| Type | `C` or `P` | `C` (call), `P` (put) |

Examples:
- `BTC_USDC-31OCT25-106000-C` — BTC call, strike $106,000, expires Oct 31 2025
- `ETH_USDC-28MAR26-4700-P` — ETH put, strike $4,700, expires Mar 28 2026
- `ARB_USDC-07FEB26-1d250-C` — ARB call, strike $1.25, expires Feb 7 2026

## ARB decimal encoding

Because ARB trades at prices below $10, its strikes use a special encoding where the decimal point is replaced with `d`:

| Encoded | Actual Price |
|---------|-------------|
| `1d250` | $1.25 |
| `0d500` | $0.50 |
| `2d000` | $2.00 |
| `0d750` | $0.75 |

## Maturity dates

- Format: `DDMMMYY` (day, 3-letter month uppercase, 2-digit year)
- Months: `JAN`, `FEB`, `MAR`, `APR`, `MAY`, `JUN`, `JUL`, `AUG`, `SEP`, `OCT`, `NOV`, `DEC`
- Expiration time: **08:00 UTC** on the maturity date
- Strikes are updated daily at **08:00 UTC**

## Available expirations

| Type | Count |
|------|-------|
| Daily | 2 |
| Weekly | 3 |
| Monthly | 2 |

## Option sizing

Options size is denominated in **contracts**, where 1 contract = 1 unit of the base asset (1 BTC, 1 ETH, 1 ARB). This is different from perpetuals, which use dollar-notional sizing.
