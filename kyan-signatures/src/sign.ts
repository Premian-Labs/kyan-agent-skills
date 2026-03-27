import { parseUnits, zeroAddress, type Address } from "viem";

import type { KyanEIP712Domain } from "./domain.js";
import {
  UserLimitOrder,
  UserMarketOrder,
  UserComboOrder,
  CancelOrdersType,
  CancelAllOrdersType,
  FillRFQType,
  OneClickSignature,
  HeartbeatType,
  OrderTyped,
} from "./types.js";

// ---------------------------------------------------------------------------
// Wallet client type (compatible with viem WalletClient that has an account)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SigningClient {
  signTypedData(args: any): Promise<`0x${string}`>;
}

// ---------------------------------------------------------------------------
// Direction enum
// ---------------------------------------------------------------------------

export const Direction = {
  BUY: 0,
  SELL: 1,
} as const;

export type DirectionValue = (typeof Direction)[keyof typeof Direction];

// ---------------------------------------------------------------------------
// Deadline helpers
// ---------------------------------------------------------------------------

/** Default deadline for orders: 30 seconds from now. */
const ORDER_DEADLINE_SECONDS = 30;

/** Default deadline for one-click sessions: 1 hour from now. */
const SESSION_DEADLINE_SECONDS = 3600;

function computeDeadline(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

// ---------------------------------------------------------------------------
// Amount conversion helper (6 decimals)
// ---------------------------------------------------------------------------

/**
 * Convert a human-readable numeric string or number to a 6-decimal bigint.
 * All amounts and prices on Kyan use 6 decimal precision (USDC standard).
 */
function toUnits(value: string | number): bigint {
  return parseUnits(String(value), 6);
}

// ---------------------------------------------------------------------------
// Shared types for function parameters
// ---------------------------------------------------------------------------

export interface LimitOrderParams {
  instrumentName: string;
  /** For options: number of contracts. For perps: notional amount. */
  contracts?: string | number;
  amount?: string | number;
  price: string | number;
  direction: "buy" | "sell" | DirectionValue;
  maker: Address;
  taker?: Address | null;
  isLiquidation?: boolean;
  isPostOnly?: boolean;
  mmp?: boolean;
}

export interface MarketOrderParams {
  instrumentName: string;
  size: string | number;
  direction: "buy" | "sell" | DirectionValue;
  limitPrice: string | number;
  taker?: Address | null;
}

export interface ComboOrderLeg {
  instrumentName: string;
  size: string | number;
  direction: "buy" | "sell" | DirectionValue;
}

export interface ComboOrderParams {
  legs: ComboOrderLeg[];
  limitNetPrice: string | number;
  limitPerpPrice: string | number;
  taker?: Address | null;
}

// ---------------------------------------------------------------------------
// Direction resolver
// ---------------------------------------------------------------------------

function resolveDirection(dir: "buy" | "sell" | DirectionValue): number {
  if (dir === "buy") return Direction.BUY;
  if (dir === "sell") return Direction.SELL;
  return dir;
}

// ---------------------------------------------------------------------------
// 1. signLimitOrder
// ---------------------------------------------------------------------------

export async function signLimitOrder(
  client: SigningClient,
  domain: KyanEIP712Domain,
  order: LimitOrderParams
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  // Options use "contracts", perps use "amount" — both map to "size"
  const sizeRaw = order.contracts ?? order.amount;
  if (sizeRaw === undefined) {
    throw new Error(
      "Either 'contracts' (options) or 'amount' (perps) must be provided"
    );
  }

  const message = {
    deadline,
    instrumentName: order.instrumentName,
    size: toUnits(sizeRaw),
    price: toUnits(order.price),
    taker: order.taker ?? zeroAddress,
    maker: order.maker,
    direction: resolveDirection(order.direction),
    isLiquidation: order.isLiquidation ?? false,
    isPostOnly: order.isPostOnly ?? false,
    mmp: order.mmp ?? false,
  };

  const signature = await client.signTypedData({
    domain,
    types: { UserLimitOrder },
    primaryType: "UserLimitOrder",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 2. signMarketOrder
// ---------------------------------------------------------------------------

export async function signMarketOrder(
  client: SigningClient,
  domain: KyanEIP712Domain,
  trade: MarketOrderParams
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  const message = {
    deadline,
    marketOrder: {
      instrumentName: trade.instrumentName,
      size: toUnits(trade.size),
      direction: resolveDirection(trade.direction),
    },
    limitPrice: toUnits(trade.limitPrice),
    taker: trade.taker ?? zeroAddress,
  };

  const signature = await client.signTypedData({
    domain,
    types: { UserMarketOrder, OrderTyped },
    primaryType: "UserMarketOrder",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 3. signComboOrder
// ---------------------------------------------------------------------------

export async function signComboOrder(
  client: SigningClient,
  domain: KyanEIP712Domain,
  combo: ComboOrderParams
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  const marketOrders = combo.legs.map((leg) => ({
    instrumentName: leg.instrumentName,
    size: toUnits(leg.size),
    direction: resolveDirection(leg.direction),
  }));

  const message = {
    deadline,
    marketOrders,
    limitNetPrice: toUnits(combo.limitNetPrice),
    limitPerpPrice: toUnits(combo.limitPerpPrice),
    taker: combo.taker ?? zeroAddress,
  };

  const signature = await client.signTypedData({
    domain,
    types: { UserComboOrder, OrderTyped },
    primaryType: "UserComboOrder",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 4. signCancelOrders
// ---------------------------------------------------------------------------

export async function signCancelOrders(
  client: SigningClient,
  domain: KyanEIP712Domain,
  maker: Address,
  orderIds: string[]
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  const message = {
    deadline,
    maker,
    orderIds,
  };

  const signature = await client.signTypedData({
    domain,
    types: { CancelOrdersType },
    primaryType: "CancelOrdersType",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 5. signCancelAllOrders
// ---------------------------------------------------------------------------

export async function signCancelAllOrders(
  client: SigningClient,
  domain: KyanEIP712Domain,
  maker: Address
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  const message = {
    deadline,
    maker,
  };

  const signature = await client.signTypedData({
    domain,
    types: { CancelAllOrdersType },
    primaryType: "CancelAllOrdersType",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 6. signFillRFQ
// ---------------------------------------------------------------------------

export async function signFillRFQ(
  client: SigningClient,
  domain: KyanEIP712Domain,
  taker: Address,
  responseId: string
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  const message = {
    deadline,
    taker,
    responseId,
  };

  const signature = await client.signTypedData({
    domain,
    types: { FillRFQType },
    primaryType: "FillRFQType",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 7. signOneClickSession
// ---------------------------------------------------------------------------

export async function signOneClickSession(
  client: SigningClient,
  domain: KyanEIP712Domain,
  user: Address,
  bindToIp: boolean = true
) {
  const deadline = computeDeadline(SESSION_DEADLINE_SECONDS);

  const message = {
    deadline,
    user,
    bindToIp,
  };

  const signature = await client.signTypedData({
    domain,
    types: { OneClickSignature },
    primaryType: "OneClickSignature",
    message,
  });

  return { signature, deadline, message };
}

// ---------------------------------------------------------------------------
// 8. signHeartbeat
// ---------------------------------------------------------------------------

export async function signHeartbeat(
  client: SigningClient,
  domain: KyanEIP712Domain,
  maker: Address,
  timeout: number | bigint
) {
  const deadline = computeDeadline(ORDER_DEADLINE_SECONDS);

  const message = {
    deadline,
    maker,
    timeout: BigInt(timeout),
  };

  const signature = await client.signTypedData({
    domain,
    types: { HeartbeatType },
    primaryType: "HeartbeatType",
    message,
  });

  return { signature, deadline, message };
}
