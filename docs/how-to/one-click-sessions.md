# How-to: Set Up One-Click Trading Sessions

> **Diataxis category:** How-to guide (task-oriented)

## Problem

Signing every order individually with EIP-712 is secure but slow for active trading. One-click sessions let you sign once and trade freely for 24 hours.

## Solution

### 1. Sign a session creation request

```typescript
import { parseUnits, zeroAddress } from "viem";

const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour (not 30s!)

const signature = await walletClient.signTypedData({
  domain,
  types: {
    OneClickSignature: [
      { name: "deadline", type: "uint256" },
      { name: "user", type: "address" },
      { name: "bindToIp", type: "bool" },
    ],
  },
  primaryType: "OneClickSignature",
  message: {
    deadline: BigInt(deadline),
    user: account.address,
    bindToIp: true, // Recommended: ties session to your IP
  },
});
```

### 2. Create the session

```typescript
const res = await fetch("https://staging.kyan.sh/session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-apikey": process.env.KYAN_API_KEY!,
  },
  body: JSON.stringify({
    user: account.address,
    bind_to_ip: true,
    signature_deadline: deadline,
    signature,
  }),
});

const { hash } = await res.json();
// hash is your session identifier
```

### 3. Trade without individual signatures

```typescript
// Now use the session hash instead of per-order signatures
const orderRes = await fetch("https://staging.kyan.sh/limit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-apikey": process.env.KYAN_API_KEY!,
    "x-one-click": hash, // Session-based auth
  },
  body: JSON.stringify([{
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
    // No signature or signature_deadline needed!
  }]),
});
```

### 4. Revoke when done

```typescript
// Revoke specific session
await fetch("https://staging.kyan.sh/session", {
  method: "DELETE",
  headers: {
    "x-apikey": process.env.KYAN_API_KEY!,
    "x-one-click": hash,
  },
});

// Or revoke ALL sessions for this API key (omit x-one-click)
await fetch("https://staging.kyan.sh/session", {
  method: "DELETE",
  headers: { "x-apikey": process.env.KYAN_API_KEY! },
});
```

## Key details

- Sessions are valid for **24 hours**
- Sessions auto-refresh on: order submission, cancellation, combo trades, RFQ operations
- `bindToIp: true` ties the session to the creating IP (recommended for security)
- The OneClickSignature deadline is **3600 seconds** (1 hour), not the 30-second deadline used for orders
- Revoking without `x-one-click` header revokes ALL sessions for the API key
