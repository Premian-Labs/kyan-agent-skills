/**
 * Integration tests for EIP-712 signing + live order submission.
 *
 * These tests generate real EIP-712 signatures and submit them to the staging API.
 * Skipped when KYAN_API_KEY, WALLET_PRIVATE_KEY, or CLEARING_HOUSE_PROXY are not set.
 *
 * Run with:
 *   KYAN_API_KEY=... WALLET_PRIVATE_KEY=... CLEARING_HOUSE_PROXY=... npm test -- integration/signing
 *
 * WARNING: These tests may place real orders on the staging exchange.
 * Use a testnet wallet with testnet USDC only.
 */

import { describe, it, expect } from "vitest";
import { createWalletClient, http, parseUnits, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { env, hasSigningCredentials } from "./env.js";

// ── Signing Helpers ───────────────────────────────────────────────────

function getWallet() {
  const account = privateKeyToAccount(`0x${env.walletPrivateKey}`);
  const client = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(),
  });
  return { account, client };
}

function getDomain() {
  return {
    chainId: 421614,
    name: "Premia" as const,
    verifyingContract: env.clearingHouseProxy as `0x${string}`,
    version: "1" as const,
  };
}

const UserLimitOrder = [
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

const OneClickSignature = [
  { name: "deadline", type: "uint256" },
  { name: "user", type: "address" },
  { name: "bindToIp", type: "bool" },
] as const;

const CancelAllOrdersType = [
  { name: "deadline", type: "uint256" },
  { name: "maker", type: "address" },
] as const;

// ── Signature Generation Tests ────────────────────────────────────────

describe.skipIf(!hasSigningCredentials)(
  "EIP-712 Signing — Signature Generation (live)",
  () => {
    it("generates a valid EIP-712 limit order signature", async () => {
      const { account, client } = getWallet();
      const domain = getDomain();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 30);

      const signature = await client.signTypedData({
        domain,
        types: { UserLimitOrder },
        primaryType: "UserLimitOrder",
        message: {
          deadline,
          instrumentName: "BTC_USDC-PERPETUAL",
          size: parseUnits("100", 6), // $100 notional — tiny order
          price: parseUnits("1", 6), // Very low price — won't fill
          taker: zeroAddress,
          maker: account.address,
          direction: 0, // buy
          isLiquidation: false,
          isPostOnly: true,
          mmp: false,
        },
      });

      expect(signature).toBeDefined();
      expect(signature.startsWith("0x")).toBe(true);
      expect(signature.length).toBe(132); // 65 bytes = 130 hex chars + "0x"
      console.log(`  Signature: ${signature.slice(0, 20)}...${signature.slice(-10)}`);
      console.log(`  Signer: ${account.address}`);
    });

    it("generates a valid one-click session signature", async () => {
      const { account, client } = getWallet();
      const domain = getDomain();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await client.signTypedData({
        domain,
        types: { OneClickSignature },
        primaryType: "OneClickSignature",
        message: {
          deadline,
          user: account.address,
          bindToIp: false,
        },
      });

      expect(signature).toBeDefined();
      expect(signature.startsWith("0x")).toBe(true);
      expect(signature.length).toBe(132);
      console.log(`  One-click signature generated for ${account.address}`);
    });
  },
);

// ── Live Order Submission Tests ───────────────────────────────────────

describe.skipIf(!hasSigningCredentials)(
  "EIP-712 Signing — Live Order Submission (staging)",
  () => {
    it("submits a limit order and gets a valid response (post or reject)", async () => {
      const { account, client } = getWallet();
      const domain = getDomain();
      const deadline = Math.floor(Date.now() / 1000) + 30;

      const signature = await client.signTypedData({
        domain,
        types: { UserLimitOrder },
        primaryType: "UserLimitOrder",
        message: {
          deadline: BigInt(deadline),
          instrumentName: "BTC_USDC-PERPETUAL",
          size: parseUnits("100", 6), // $100 — minimum viable order
          price: parseUnits("1", 6), // $1 — absurdly low, won't fill
          taker: zeroAddress,
          maker: account.address,
          direction: 0, // buy
          isLiquidation: false,
          isPostOnly: true,
          mmp: false,
        },
      });

      const response = await fetch(`${env.baseUrl}/limit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-apikey": env.apiKey!,
        },
        body: JSON.stringify([
          {
            instrument_name: "BTC_USDC-PERPETUAL",
            type: "good_til_cancelled",
            amount: 100,
            direction: "buy",
            price: 1,
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

      const body = await response.json();
      console.log(`  POST /limit status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(body).slice(0, 500)}`);

      // The order may be posted or rejected (insufficient margin, etc.)
      // but the API should accept the request format
      expect(response.status).toBeLessThan(500); // No server errors
      expect(body).toBeDefined();
    });

    it("cancel all orders via signed request", async () => {
      const { account, client } = getWallet();
      const domain = getDomain();
      const deadline = Math.floor(Date.now() / 1000) + 30;

      const signature = await client.signTypedData({
        domain,
        types: { CancelAllOrdersType },
        primaryType: "CancelAllOrdersType",
        message: {
          deadline: BigInt(deadline),
          maker: account.address,
        },
      });

      const response = await fetch(`${env.baseUrl}/orders_all`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-apikey": env.apiKey!,
        },
        body: JSON.stringify({
          maker: account.address,
          signature,
          signature_deadline: deadline,
        }),
      });

      const body = await response.json();
      console.log(`  DELETE /orders_all status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(body).slice(0, 300)}`);

      expect(response.status).toBeLessThan(500);
      expect(body).toBeDefined();
    });
  },
);

// ── One-Click Session Tests ───────────────────────────────────────────

describe.skipIf(!hasSigningCredentials)(
  "EIP-712 Signing — One-Click Session (staging)",
  () => {
    it("creates and revokes a one-click session", async () => {
      const { account, client } = getWallet();
      const domain = getDomain();
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Sign session creation
      const signature = await client.signTypedData({
        domain,
        types: { OneClickSignature },
        primaryType: "OneClickSignature",
        message: {
          deadline: BigInt(deadline),
          user: account.address,
          bindToIp: false,
        },
      });

      // Create session
      const createRes = await fetch(`${env.baseUrl}/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-apikey": env.apiKey!,
        },
        body: JSON.stringify({
          user: account.address,
          bind_to_ip: false,
          signature_deadline: deadline,
          signature,
        }),
      });

      const createBody = (await createRes.json()) as { hash?: string };
      console.log(`  POST /session status: ${createRes.status}`);
      console.log(`  Response: ${JSON.stringify(createBody).slice(0, 200)}`);

      if (createRes.status === 200 && createBody.hash) {
        console.log(`  Session hash: ${createBody.hash.slice(0, 20)}...`);

        // Revoke the session
        const revokeRes = await fetch(`${env.baseUrl}/session`, {
          method: "DELETE",
          headers: {
            "x-apikey": env.apiKey!,
            "x-one-click": createBody.hash,
          },
        });

        const revokeBody = await revokeRes.json();
        console.log(`  DELETE /session status: ${revokeRes.status}`);
        console.log(`  Revoke response: ${JSON.stringify(revokeBody)}`);
        expect(revokeRes.status).toBeLessThan(500);
      }

      expect(createRes.status).toBeLessThan(500);
    });
  },
);
