/**
 * EIP-712 typed data definitions for all Kyan signature types.
 *
 * Field order is CRITICAL for EIP-712 — the struct hash is computed
 * from fields in the exact order defined here. Changing order will
 * produce different signatures that the smart contracts will reject.
 *
 * Each constant is a TypedDataParameter array compatible with viem's
 * signTypedData function.
 */

// ---------------------------------------------------------------------------
// Shared sub-type: OrderTyped
// Used by UserMarketOrder and UserComboOrder
// ---------------------------------------------------------------------------

export const OrderTyped = [
  { name: "instrumentName", type: "string" },
  { name: "size", type: "uint256" },
  { name: "direction", type: "uint8" },
] as const;

// ---------------------------------------------------------------------------
// 1. UserLimitOrder
// ---------------------------------------------------------------------------

export const UserLimitOrder = [
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
] as const;

// ---------------------------------------------------------------------------
// 2. UserMarketOrder
// ---------------------------------------------------------------------------

export const UserMarketOrder = [
  { name: "deadline", type: "uint256" },
  { name: "marketOrder", type: "OrderTyped" },
  { name: "limitPrice", type: "uint256" },
  { name: "taker", type: "address" },
] as const;

// ---------------------------------------------------------------------------
// 3. UserComboOrder
// ---------------------------------------------------------------------------

export const UserComboOrder = [
  { name: "deadline", type: "uint256" },
  { name: "marketOrders", type: "OrderTyped[]" },
  { name: "limitNetPrice", type: "int256" },
  { name: "limitPerpPrice", type: "int256" },
  { name: "taker", type: "address" },
] as const;

// ---------------------------------------------------------------------------
// 4. CancelOrdersType
// ---------------------------------------------------------------------------

export const CancelOrdersType = [
  { name: "deadline", type: "uint256" },
  { name: "maker", type: "address" },
  { name: "orderIds", type: "string[]" },
] as const;

// ---------------------------------------------------------------------------
// 5. CancelAllOrdersType
// ---------------------------------------------------------------------------

export const CancelAllOrdersType = [
  { name: "deadline", type: "uint256" },
  { name: "maker", type: "address" },
] as const;

// ---------------------------------------------------------------------------
// 6. FillRFQType
// ---------------------------------------------------------------------------

export const FillRFQType = [
  { name: "deadline", type: "uint256" },
  { name: "taker", type: "address" },
  { name: "responseId", type: "string" },
] as const;

// ---------------------------------------------------------------------------
// 7. OneClickSignature
// ---------------------------------------------------------------------------

export const OneClickSignature = [
  { name: "deadline", type: "uint256" },
  { name: "user", type: "address" },
  { name: "bindToIp", type: "bool" },
] as const;

// ---------------------------------------------------------------------------
// 8. HeartbeatType
// ---------------------------------------------------------------------------

export const HeartbeatType = [
  { name: "deadline", type: "uint256" },
  { name: "maker", type: "address" },
  { name: "timeout", type: "uint256" },
] as const;
