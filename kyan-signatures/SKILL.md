---
name: kyan-signatures
description: Generate EIP-712 typed data signatures for all Kyan.blue trading operations. Covers 8 signature types including limit orders, market orders, combo trades, cancellations, RFQ fills, one-click sessions, and heartbeat pings.
version: 1.0.0
---

# Kyan Signatures

EIP-712 typed data signing utilities for the Kyan.blue derivatives trading exchange. Every state-changing API request on Kyan must include an EIP-712 signature proving the caller controls the signing wallet.

## EIP-712 Domain

The domain name is **"Premia"** (inherited from the Premia protocol infrastructure) with version **"1"**. Every signature must include the correct `chainId` and the ClearingHouseProxy contract address as `verifyingContract`.

Supported chains:

| Chain             | Chain ID |
|-------------------|----------|
| Arbitrum Sepolia  | 421614   |
| Arbitrum One      | 42161    |

```ts
import { createEIP712Domain, SUPPORTED_CHAIN_IDS } from "@kyan-skills/signatures";

const domain = createEIP712Domain(
  SUPPORTED_CHAIN_IDS.ARBITRUM_ONE,       // or ARBITRUM_SEPOLIA for testnet
  "0x...ClearingHouseProxyAddress"
);
// => { name: "Premia", version: "1", chainId: 42161, verifyingContract: "0x..." }
```

The domain object is passed to every signing function. See `src/domain.ts` for the full implementation.

## Signature Types

There are 8 EIP-712 signature types. Each is defined as a `TypedDataParameter[]` constant in `src/types.ts`. Field order is **critical** -- the EIP-712 struct hash depends on it.

### 1. UserLimitOrder

Place a limit order for options or perpetuals.

Fields: `deadline(uint256)`, `instrumentName(string)`, `size(uint256)`, `price(uint256)`, `taker(address)`, `maker(address)`, `direction(uint8)`, `isLiquidation(bool)`, `isPostOnly(bool)`, `mmp(bool)`

```ts
import { signLimitOrder } from "@kyan-skills/signatures";

// Options order -- use "contracts" for the size field
const result = await signLimitOrder(walletClient, domain, {
  instrumentName: "BTC_USDC-28MAR25-100000-C",
  contracts: "10",       // 10 option contracts
  price: "0.05",         // price per contract in USDC
  direction: "buy",      // buy=0, sell=1
  maker: walletAddress,
  taker: null,           // null => zeroAddress (any taker)
  isPostOnly: true,
});

// Perpetual order -- use "amount" for the size field
const result = await signLimitOrder(walletClient, domain, {
  instrumentName: "BTC_USDC-PERPETUAL",
  amount: "0.5",         // 0.5 BTC notional
  price: "65000",        // limit price in USDC
  direction: "sell",
  maker: walletAddress,
});

// result => { signature, deadline, message }
```

### 2. UserMarketOrder

Execute at market price with a limit price cap. Contains a nested `OrderTyped` struct.

Fields: `deadline(uint256)`, `marketOrder(OrderTyped)`, `limitPrice(uint256)`, `taker(address)`

```ts
import { signMarketOrder } from "@kyan-skills/signatures";

const result = await signMarketOrder(walletClient, domain, {
  instrumentName: "ETH-PERP",
  size: "1.5",
  direction: "buy",
  limitPrice: "3500",    // worst acceptable price
  taker: walletAddress,  // optional, defaults to zeroAddress
});
```

### 3. UserComboOrder

Multi-leg combo trade (e.g. spread, straddle). Contains an array of `OrderTyped` structs.

Fields: `deadline(uint256)`, `marketOrders(OrderTyped[])`, `limitNetPrice(int256)`, `limitPerpPrice(int256)`, `taker(address)`

```ts
import { signComboOrder } from "@kyan-skills/signatures";

const result = await signComboOrder(walletClient, domain, {
  legs: [
    { instrumentName: "BTC_USDC-28MAR25-90000-C", size: "5", direction: "buy" },
    { instrumentName: "BTC_USDC-28MAR25-100000-C", size: "5", direction: "sell" },
  ],
  limitNetPrice: "0.02",   // max net debit
  limitPerpPrice: "0",
});
```

### 4. CancelOrdersType

Cancel specific orders by ID.

Fields: `deadline(uint256)`, `maker(address)`, `orderIds(string[])`

```ts
import { signCancelOrders } from "@kyan-skills/signatures";

const result = await signCancelOrders(walletClient, domain, makerAddress, [
  "order-id-1",
  "order-id-2",
]);
```

### 5. CancelAllOrdersType

Cancel all open orders for a maker.

Fields: `deadline(uint256)`, `maker(address)`

```ts
import { signCancelAllOrders } from "@kyan-skills/signatures";

const result = await signCancelAllOrders(walletClient, domain, makerAddress);
```

### 6. FillRFQType

Accept an RFQ (Request for Quote) response.

Fields: `deadline(uint256)`, `taker(address)`, `responseId(string)`

```ts
import { signFillRFQ } from "@kyan-skills/signatures";

const result = await signFillRFQ(walletClient, domain, takerAddress, "rfq-response-123");
```

### 7. OneClickSignature

Establish a one-click trading session. Avoids per-trade wallet popups for the session duration.

Fields: `deadline(uint256)`, `user(address)`, `bindToIp(bool)`

```ts
import { signOneClickSession } from "@kyan-skills/signatures";

// bindToIp=true (default) locks the session to the client's IP for security
const result = await signOneClickSession(walletClient, domain, userAddress, true);
// deadline is 3600 seconds (1 hour) for sessions, not 30s like orders
```

### 8. HeartbeatType

Market-maker heartbeat to maintain active quoting status.

Fields: `deadline(uint256)`, `maker(address)`, `timeout(uint256)`

```ts
import { signHeartbeat } from "@kyan-skills/signatures";

const result = await signHeartbeat(walletClient, domain, makerAddress, 30);
// timeout is in seconds
```

## Key Rules

### Field Precision

All amounts, prices, and sizes use **6 decimal** precision (USDC standard). The signing functions handle conversion automatically via `parseUnits(value, 6)`. Pass human-readable strings:

- `"10"` becomes `10_000_000n`
- `"0.05"` becomes `50_000n`
- `"65000"` becomes `65_000_000_000n`

### Direction Mapping

| Direction | Value |
|-----------|-------|
| buy       | 0     |
| sell      | 1     |

Pass either the string `"buy"`/`"sell"` or the numeric constant `Direction.BUY`/`Direction.SELL`.

### Deadline Constraints

- **Orders** (limit, market, combo, cancel, RFQ, heartbeat): 30-second deadline from signing time.
- **One-click sessions**: 3600-second (1 hour) deadline.
- Deadlines are **monotonically increasing** Unix timestamps. The exchange rejects signatures with expired deadlines.

### Options vs Perpetuals Sizing

The `signLimitOrder` function accepts either:

- `contracts` -- for options, representing the number of contracts
- `amount` -- for perpetuals, representing the notional size

Both map to the `size` field in the EIP-712 struct. Exactly one must be provided.

### Taker Address

When `taker` is `null` or omitted, it defaults to `zeroAddress` (`0x000...000`), meaning the order is open to any counterparty. Set a specific taker address for directed/private orders.

## One-Click Sessions vs Individual Signatures

**Individual signatures**: Every order requires a wallet popup for the user to approve the EIP-712 signature. Safest but high friction.

**One-click sessions**: Sign a `OneClickSignature` once to establish a session (1-hour deadline). The session signature is sent with subsequent API calls, and the server signs orders on behalf of the user without further wallet interaction. Set `bindToIp: true` to lock the session to the client's IP for security.

Typical flow:
1. Sign `OneClickSignature` with wallet
2. Send session signature to the API
3. Place orders via REST API without further wallet popups
4. Session expires after the deadline; re-sign to continue

## File Reference

| File | Purpose |
|------|---------|
| `src/domain.ts` | EIP-712 domain constructor and chain constants |
| `src/types.ts` | All 8 EIP-712 type definitions (field arrays) |
| `src/sign.ts` | Signing functions, direction mapping, deadline logic |
| `src/index.ts` | Barrel re-exports |
| `examples/sign-limit-order.ts` | Full worked example for options and perp limit orders |
