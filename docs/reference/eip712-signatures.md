# Reference: EIP-712 Signature Types

> **Diataxis category:** Reference (information-oriented)

## Domain Configuration

All Kyan signatures share this EIP-712 domain:

| Field | Value |
|-------|-------|
| `name` | `"Premia"` |
| `version` | `"1"` |
| `chainId` | `421614` (Arbitrum Sepolia) or `42161` (Arbitrum One) |
| `verifyingContract` | ClearingHouseProxy address (Sepolia: `0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0`) |

See [Contract Addresses](./contract-addresses.md) for all addresses and endpoints.

## Type 1: UserLimitOrder

| Field | Type | Notes |
|-------|------|-------|
| `deadline` | `uint256` | Unix timestamp, within 30s of now |
| `instrumentName` | `string` | e.g. `BTC_USDC-PERPETUAL` |
| `size` | `uint256` | 6-decimal. Options: contracts. Perps: dollar-notional |
| `price` | `uint256` | 6-decimal |
| `taker` | `address` | `zeroAddress` for open orders |
| `maker` | `address` | Your wallet address |
| `direction` | `uint8` | `0` = buy, `1` = sell |
| `isLiquidation` | `bool` | |
| `isPostOnly` | `bool` | |
| `mmp` | `bool` | Market maker protection flag |

## Type 2: UserMarketOrder

Requires both `OrderTyped` and `UserMarketOrder` in the types object.

**OrderTyped:**

| Field | Type |
|-------|------|
| `instrumentName` | `string` |
| `size` | `uint256` |
| `direction` | `uint8` |

**UserMarketOrder:**

| Field | Type |
|-------|------|
| `deadline` | `uint256` |
| `marketOrder` | `OrderTyped` |
| `limitPrice` | `uint256` |
| `taker` | `address` |

## Type 3: UserComboOrder

Uses `OrderTyped[]` for multi-leg trades.

| Field | Type | Notes |
|-------|------|-------|
| `deadline` | `uint256` | |
| `marketOrders` | `OrderTyped[]` | Array of legs |
| `limitNetPrice` | `int256` | **Signed** — negative = debit |
| `limitPerpPrice` | `int256` | **Signed** |
| `taker` | `address` | |

## Type 4: CancelOrdersType

| Field | Type |
|-------|------|
| `deadline` | `uint256` |
| `maker` | `address` |
| `orderIds` | `string[]` |

## Type 5: CancelAllOrdersType

| Field | Type |
|-------|------|
| `deadline` | `uint256` |
| `maker` | `address` |

## Type 6: FillRFQType

| Field | Type |
|-------|------|
| `deadline` | `uint256` |
| `taker` | `address` |
| `responseId` | `string` |

## Type 7: OneClickSignature

| Field | Type | Notes |
|-------|------|-------|
| `deadline` | `uint256` | Use 3600s, not 30s |
| `user` | `address` | |
| `bindToIp` | `bool` | Recommended: `true` |

## Type 8: HeartbeatType

| Field | Type | Notes |
|-------|------|-------|
| `deadline` | `uint256` | |
| `maker` | `address` | |
| `timeout` | `uint256` | Seconds until auto-cancel |

## Critical Rules

1. **Field order matters.** EIP-712 hashes depend on field order. Use exactly the order shown above.
2. **Deadlines are monotonically increasing.** Each new `signature_deadline` for a maker must be strictly greater than the last accepted one. This prevents replay attacks.
3. **6-decimal precision.** All `size` and `price` values must be converted using `parseUnits(value, 6)`.
4. **30-second vs 3600-second deadlines.** Order signatures use 30s. OneClickSignature uses 3600s (1 hour).
5. **Options vs perpetuals sizing.** Options `size` = number of contracts. Perpetuals `size` = dollar-notional amount.

## See also

- [Tutorial: Your First Trade](../tutorials/01-first-trade.md)
- [How-to: One-Click Trading Sessions](../how-to/one-click-sessions.md)
- [Explanation: Authentication Methods](../explanation/authentication-methods.md)
- [Reference: Contract Addresses](./contract-addresses.md)
