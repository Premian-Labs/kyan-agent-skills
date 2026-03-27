/**
 * Example: Place a limit order on the Kyan exchange.
 *
 * Demonstrates both:
 *   1. One-click session mode (sign once, trade many)
 *   2. Individual signature mode (sign each order)
 */

import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

import { KyanClient, postLimitOrders, createSession } from "../src/index.js";
import { createEIP712Domain } from "../../kyan-signatures/src/domain.js";
import {
  UserLimitOrder,
  OneClickSignature,
} from "../../kyan-signatures/src/types.js";
import { CONTRACTS, ENDPOINTS } from "../../shared/src/constants.js";
import type { LimitOrderRequest } from "../../shared/src/types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const API_KEY = process.env.KYAN_API_KEY!;
const CLEARING_HOUSE_PROXY = process.env
  .CLEARING_HOUSE_PROXY as Address;

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http(),
});

const client = new KyanClient({
  apiKey: API_KEY,
  baseUrl: ENDPOINTS.REST_STAGING,
});

const domain = createEIP712Domain(
  arbitrumSepolia.id,
  CLEARING_HOUSE_PROXY,
);

// ---------------------------------------------------------------------------
// Helper: sign a limit order
// ---------------------------------------------------------------------------

async function signLimitOrder(order: LimitOrderRequest, deadline: number) {
  const signature = await walletClient.signTypedData({
    domain,
    types: { UserLimitOrder },
    primaryType: "UserLimitOrder",
    message: {
      deadline: BigInt(deadline),
      instrumentName: order.instrument_name,
      size: BigInt(Math.round(order.contracts! * 1e6)), // USDC 6 decimals
      price: BigInt(Math.round(order.price * 1e6)),
      taker: (order.taker ?? "0x0000000000000000000000000000000000000000") as Address,
      maker: order.maker,
      direction: order.direction === "buy" ? 0 : 1,
      isLiquidation: order.liquidation,
      isPostOnly: order.post_only,
      mmp: order.mmp,
    },
  });
  return signature;
}

// ---------------------------------------------------------------------------
// Mode 1: Individual signature per order
// ---------------------------------------------------------------------------

async function placeOrderWithSignature() {
  console.log("--- Mode 1: Individual Signature ---");

  const deadline = Math.floor(Date.now() / 1000) + 30;

  const order: LimitOrderRequest = {
    instrument_name: "ETH_USDC-PERPETUAL",
    type: "good_til_cancelled",
    amount: 100, // $100 notional for perpetuals
    direction: "buy",
    price: 3200,
    post_only: true,
    mmp: false,
    liquidation: false,
    maker: account.address,
    taker: "0x0000000000000000000000000000000000000000", // v1.18.0: zero address only
  };

  const signature = await signLimitOrder(order, deadline);

  const result = await postLimitOrders(client, [order], {
    signature,
    signature_deadline: deadline,
  });

  console.log("Posted:", result.posted.length);
  console.log("Rejected:", result.rejected.length);

  if (result.posted.length > 0) {
    console.log("Order ID:", result.posted[0]!.order_id);
  }
  if (result.rejected.length > 0) {
    console.log("Rejection reason:", result.rejected[0]!.reason);
  }
}

// ---------------------------------------------------------------------------
// Mode 2: One-click session (sign once, trade without signing each order)
// ---------------------------------------------------------------------------

async function placeOrderWithSession() {
  console.log("\n--- Mode 2: One-Click Session ---");

  // Step 1: Create a one-click session
  const sessionDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  const sessionSignature = await walletClient.signTypedData({
    domain,
    types: { OneClickSignature },
    primaryType: "OneClickSignature",
    message: {
      deadline: BigInt(sessionDeadline),
      user: account.address,
      bindToIp: true,
    },
  });

  const session = await createSession(client, {
    signature: sessionSignature,
    signature_deadline: sessionDeadline,
  });

  console.log("Session hash:", session.hash);

  // Step 2: Place orders using the session (no per-order signature needed)
  const order: LimitOrderRequest = {
    instrument_name: "BTC_USDC-31DEC25-120000-C",
    type: "good_til_cancelled",
    contracts: 0.5,
    direction: "sell",
    price: 5200,
    post_only: true,
    mmp: false,
    liquidation: false,
    maker: account.address,
    taker: "0x0000000000000000000000000000000000000000",
  };

  // Pass the session hash via oneClickHash — no signatureData needed
  const result = await postLimitOrders(client, [order], undefined, {
    oneClickHash: session.hash,
  });

  console.log("Posted:", result.posted.length);
  console.log("Rejected:", result.rejected.length);

  if (result.posted.length > 0) {
    console.log("Order ID:", result.posted[0]!.order_id);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    await placeOrderWithSignature();
    await placeOrderWithSession();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
