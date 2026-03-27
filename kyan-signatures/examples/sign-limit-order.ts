/**
 * Example: Signing limit orders on Kyan.blue
 *
 * Demonstrates how to sign both an options (contracts) and a perpetual (amount)
 * limit order using EIP-712 typed data signatures.
 *
 * IMPORTANT: Never hardcode private keys in production code. Use environment
 * variables, hardware wallets, or secure key management systems.
 */

import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

import {
  createEIP712Domain,
  signLimitOrder,
  SUPPORTED_CHAIN_IDS,
} from "../src";

// ---------------------------------------------------------------------------
// Setup — replace with your own key and contract address
// ---------------------------------------------------------------------------

// Load from environment — never hardcode real keys!
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("Set WALLET_PRIVATE_KEY env var");

const CLEARING_HOUSE_PROXY = (process.env.CLEARING_HOUSE_PROXY ??
  "0x0000000000000000000000000000000000000001") as Address;

const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

const walletClient = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http(),
});

// Create the EIP-712 domain for Arbitrum Sepolia
const domain = createEIP712Domain(
  SUPPORTED_CHAIN_IDS.ARBITRUM_SEPOLIA,
  CLEARING_HOUSE_PROXY
);

// ---------------------------------------------------------------------------
// Example 1: Sign a BTC options limit order
// ---------------------------------------------------------------------------

async function signOptionsOrder() {
  console.log("--- Options Limit Order ---");

  const { signature, deadline, message } = await signLimitOrder(
    walletClient,
    domain,
    {
      instrumentName: "BTC_USDC-28MAR25-100000-C", // BTC call option
      contracts: "10", // 10 contracts (options use "contracts")
      price: "0.05", // 0.05 USDC per contract
      direction: "buy",
      maker: account.address,
      taker: null, // zeroAddress — open to any taker
      isPostOnly: true, // maker-only order
    }
  );

  console.log("Signature:", signature);
  console.log("Deadline:", deadline.toString());
  console.log("Message:", message);

  // Use these values in the Kyan REST API request:
  // POST /orders/limit
  // {
  //   "signature": signature,
  //   "deadline": deadline.toString(),
  //   "instrument_name": "BTC_USDC-28MAR25-100000-C",
  //   ...
  // }
}

// ---------------------------------------------------------------------------
// Example 2: Sign a BTC perpetual limit order
// ---------------------------------------------------------------------------

async function signPerpOrder() {
  console.log("\n--- Perpetual Limit Order ---");

  const { signature, deadline, message } = await signLimitOrder(
    walletClient,
    domain,
    {
      instrumentName: "BTC_USDC-PERPETUAL", // BTC perpetual
      amount: "10000", // $10,000 notional (perps use dollar-notional "amount")
      price: "65000", // $65,000 limit price
      direction: "sell",
      maker: account.address,
    }
  );

  console.log("Signature:", signature);
  console.log("Deadline:", deadline.toString());
  console.log("Message:", message);
}

// ---------------------------------------------------------------------------
// Run examples
// ---------------------------------------------------------------------------

async function main() {
  await signOptionsOrder();
  await signPerpOrder();
}

main().catch(console.error);
