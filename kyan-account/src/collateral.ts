/**
 * Collateral operations: deposit, withdraw, and transfer between margin accounts.
 *
 * Primary collateral is USDC with 6 decimal precision.
 */

import type { TradingPair } from "../../shared/src/types.js";

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

type KyanClient = {
  get: (path: string, params?: Record<string, string>) => Promise<any>;
  post: (path: string, body?: unknown) => Promise<any>;
  delete: (path: string, body?: unknown) => Promise<any>;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** EIP-712 signature data included with collateral operations. */
export interface SignatureData {
  signature: string;
  nonce: string;
  deadline: number;
  [key: string]: unknown;
}

/** Successful deposit/withdraw/transfer response. */
export interface CollateralResponse {
  success: boolean;
  transaction_hash?: string;
  [key: string]: unknown;
}

/**
 * Error codes for deposit failures.
 *
 * - DEPOSIT_LIMIT_EXCEEDED: the deposit would exceed the account's deposit
 *   limit. Response includes `limit`, `currentTotal`, and `requested`.
 * - ACCOUNT_LIMIT_REACHED: maximum number of margin accounts already exist.
 */
export type DepositErrorCode = "DEPOSIT_LIMIT_EXCEEDED" | "ACCOUNT_LIMIT_REACHED";

export interface DepositLimitError {
  error: "DEPOSIT_LIMIT_EXCEEDED";
  limit: number;
  currentTotal: number;
  requested: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Deposit USDC collateral into a margin account.
 *
 * @param amount  USDC amount (6 decimal precision, e.g. 1000 = 1000 USDC)
 * @param pair    Target trading pair / margin account
 *
 * @throws KyanApiError with code DEPOSIT_LIMIT_EXCEEDED when the deposit
 *   would exceed the account limit (response includes limit, currentTotal,
 *   and requested fields).
 * @throws KyanApiError with code ACCOUNT_LIMIT_REACHED when the maximum
 *   number of margin accounts already exist.
 */
export async function deposit(
  client: KyanClient,
  amount: number,
  pair: TradingPair,
  signatureData?: SignatureData,
): Promise<CollateralResponse> {
  return client.post("/deposit", {
    amount,
    pair,
    ...signatureData,
  });
}

/**
 * Withdraw USDC collateral from a margin account.
 *
 * Withdrawals may be rejected if removing the collateral would cause the
 * account to fall below maintenance margin requirements.
 *
 * @param amount  USDC amount to withdraw (6 decimal precision)
 * @param pair    Source trading pair / margin account
 */
export async function withdraw(
  client: KyanClient,
  amount: number,
  pair: TradingPair,
  signatureData?: SignatureData,
): Promise<CollateralResponse> {
  return client.post("/withdraw", {
    amount,
    pair,
    ...signatureData,
  });
}

/**
 * Transfer USDC collateral between margin accounts.
 *
 * Moves funds from one pair's margin account to another without
 * leaving the exchange. Subject to the same margin checks as withdrawals
 * on the source account.
 *
 * @param amount    USDC amount to move (6 decimal precision)
 * @param fromPair  Source margin account
 * @param toPair    Destination margin account
 */
export async function transfer(
  client: KyanClient,
  amount: number,
  fromPair: TradingPair,
  toPair: TradingPair,
  signatureData?: SignatureData,
): Promise<CollateralResponse> {
  return client.post("/transfer", {
    amount,
    from_pair: fromPair,
    to_pair: toPair,
    ...signatureData,
  });
}
