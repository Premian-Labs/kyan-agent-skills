# Tutorial: Your First Trade on Kyan

> **Diataxis category:** Tutorial (learning-oriented)
> **Time:** ~15 minutes
> **Prerequisites:** Node.js 18+, a Kyan API key, USDC on Arbitrum

## What you'll learn

By the end of this tutorial, you will have:
1. Connected to Kyan's API
2. Signed an EIP-712 order
3. Placed a limit order on BTC perpetuals
4. Verified the order was posted

## Step 1: Install dependencies

```bash
npm install viem
```

## Step 2: Set up your environment

Create a `.env` file (never commit this):

```
KYAN_API_KEY=your_api_key_here
WALLET_PRIVATE_KEY=your_private_key_here
```

## Step 3: Create the EIP-712 domain

Every signed message on Kyan requires an EIP-712 domain. Kyan's domain uses the name "Premia" (the protocol it's built on).

```typescript
import { createWalletClient, http, parseUnits, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const CLEARING_HOUSE_PROXY = "0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0"; // Arbitrum Sepolia

const domain = {
  chainId: 421614, // Arbitrum Sepolia testnet
  name: "Premia",
  verifyingContract: CLEARING_HOUSE_PROXY,
  version: "1",
} as const;
```

## Step 4: Sign a limit order

Kyan uses typed data signatures so your orders are cryptographically authenticated without sending your private key.

```typescript
const account = privateKeyToAccount(`0x${process.env.WALLET_PRIVATE_KEY}`);
const walletClient = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http(),
});

const deadline = Math.floor(Date.now() / 1000) + 30; // 30-second window

const signature = await walletClient.signTypedData({
  domain,
  types: {
    UserLimitOrder: [
      { name: "deadline", type: "uint256" },
      { name: "instrumentName", type: "string" },
      { name: "size", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "taker", type: "address" },
      { name: "maker", type: "address" },
      { name: "direction", type: "uint8" },
      { name: "isLiquidation", type: "bool" },
      { name: "isPostOnly", type: "bool" },
      { name: "mmp", type: "bool" },
    ],
  },
  primaryType: "UserLimitOrder",
  message: {
    deadline: BigInt(deadline),
    instrumentName: "BTC_USDC-PERPETUAL",
    size: parseUnits("10000", 6), // $10,000 notional
    price: parseUnits("85000", 6), // $85,000 limit price
    taker: zeroAddress,
    maker: account.address,
    direction: 0, // 0 = buy, 1 = sell
    isLiquidation: false,
    isPostOnly: true,
    mmp: false,
  },
});
```

Key points:
- **Deadline** must be within 30 seconds of the current time
- **Size** for perpetuals is dollar-notional (e.g., $10,000), not contracts
- **Size** for options is number of contracts (1 contract = 1 unit of base asset)
- All prices and sizes use **6-decimal precision** (USDC standard)
- **Direction**: `0` = buy, `1` = sell

## Step 5: Submit the order

```typescript
const response = await fetch("https://staging.kyan.sh/limit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-apikey": process.env.KYAN_API_KEY!,
  },
  body: JSON.stringify([
    {
      instrument_name: "BTC_USDC-PERPETUAL",
      type: "good_til_cancelled",
      amount: 10000,
      direction: "buy",
      price: 85000,
      post_only: true,
      mmp: false,
      liquidation: false,
      maker: account.address,
      taker: null,
      signature,
      signature_deadline: deadline,
    },
  ]),
});

const result = await response.json();
console.log("Posted:", result.posted);
console.log("Rejected:", result.rejected);
```

## Step 6: Verify your order

```typescript
const ordersResponse = await fetch("https://staging.kyan.sh/orders", {
  headers: { "x-apikey": process.env.KYAN_API_KEY! },
});

const orders = await ordersResponse.json();
console.log("Open orders:", orders);
```

## What's next?

- [Tutorial: Streaming market data with WebSockets](./02-websocket-streaming.md)
- [How-to: Set up one-click trading sessions](../how-to/one-click-sessions.md)
- [Reference: All 8 EIP-712 signature types](../reference/eip712-signatures.md)
