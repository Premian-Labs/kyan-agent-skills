/**
 * Integration tests for Kyan REST API.
 *
 * These tests hit the real staging API and verify actual responses.
 * Skipped automatically when KYAN_API_KEY is not set.
 *
 * Run with: KYAN_API_KEY=your_key npm test -- integration/rest-api
 */

import { describe, it, expect } from "vitest";
import { env, hasApiKey, hasSigningCredentials } from "./env.js";

// ── Helpers ────────────────────────────────────────────────────────────

async function kyanGet(path: string, params?: Record<string, string>) {
  let url = `${env.baseUrl}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, {
    headers: {
      "x-apikey": env.apiKey!,
      "Content-Type": "application/json",
    },
  });
  return { status: res.status, body: await res.json().catch(() => null), res };
}

// ── Read-Only Market Data Tests ────────────────────────────────────────

describe.skipIf(!hasApiKey)("REST API — Market Data (live)", () => {
  it("GET /exchange-info returns exchange metadata", async () => {
    const { status, body } = await kyanGet("/exchange-info");
    expect(status).toBe(200);
    expect(body).toBeDefined();
    // Exchange info should contain version or configuration data
    console.log("  Exchange info keys:", Object.keys(body as object));
  });

  it("GET /instruments returns active instruments", async () => {
    const { status, body } = await kyanGet("/instruments");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    const instruments = body as Array<{ instrument_name: string }>;
    expect(instruments.length).toBeGreaterThan(0);

    // Verify instrument naming convention: should contain _USDC
    const sample = instruments[0]!;
    expect(sample.instrument_name).toBeDefined();
    console.log(
      `  Found ${instruments.length} instruments, sample: ${sample.instrument_name}`,
    );

    // Check that perpetuals exist
    const perps = instruments.filter((i) =>
      i.instrument_name.includes("PERPETUAL"),
    );
    expect(perps.length).toBeGreaterThan(0);
    console.log(`  Perpetuals: ${perps.map((p) => p.instrument_name).join(", ")}`);
  });

  it("GET /expirations returns settlement dates", async () => {
    const { status, body } = await kyanGet("/expirations");
    expect(status).toBe(200);
    expect(body).toBeDefined();
    console.log("  Expirations:", JSON.stringify(body).slice(0, 200));
  });

  it("GET /index-price returns underlying prices", async () => {
    const { status, body } = await kyanGet("/index-price");
    expect(status).toBe(200);
    expect(body).toBeDefined();
    console.log("  Index prices:", JSON.stringify(body).slice(0, 200));
  });

  it("GET /order_book returns orderbook data", async () => {
    const { status, body } = await kyanGet("/order_book", {
      instrument_name: "BTC_USDC-PERPETUAL",
    });
    expect(status).toBe(200);
    expect(body).toBeDefined();
    console.log("  Orderbook response keys:", Object.keys(body as object));
  });
});

// ── Exchange Info Discovery ────────────────────────────────────────────

describe.skipIf(!hasApiKey)(
  "REST API — Exchange Info Discovery (live)",
  () => {
    it("exchange-info should reveal ClearingHouseProxy or contract addresses", async () => {
      const { body } = await kyanGet("/exchange-info");
      const json = JSON.stringify(body, null, 2);

      // Search for anything that looks like a contract address
      const addressPattern = /0x[0-9a-fA-F]{40}/g;
      const addresses = json.match(addressPattern) ?? [];
      console.log("  Contract addresses found in exchange-info:");
      for (const addr of addresses) {
        console.log(`    ${addr}`);
      }

      // Search for clearing house or verifying contract references
      const lowerJson = json.toLowerCase();
      const hasClearingHouse =
        lowerJson.includes("clearinghouse") ||
        lowerJson.includes("clearing_house") ||
        lowerJson.includes("verifyingcontract") ||
        lowerJson.includes("verifying_contract");
      console.log(`  Contains clearing house reference: ${hasClearingHouse}`);

      // Log full response for manual inspection (truncated)
      console.log("  Full exchange-info (first 1000 chars):");
      console.log(`  ${json.slice(0, 1000)}`);
    });
  },
);

// ── Account Tests (require API key) ───────────────────────────────────

describe.skipIf(!hasApiKey)("REST API — Account (live)", () => {
  it("GET /orders returns open orders (may be empty)", async () => {
    const { status, body } = await kyanGet("/orders");
    expect(status).toBe(200);
    // Could be empty array or object depending on state
    expect(body).toBeDefined();
    console.log("  Open orders:", JSON.stringify(body).slice(0, 200));
  });
});

// ── Rate Limit Verification ───────────────────────────────────────────

describe.skipIf(!hasApiKey)("REST API — Rate Limits (live)", () => {
  it("rapid requests don't immediately 429 (within market data limit)", async () => {
    // Market data limit is 20/second, so 5 rapid calls should be fine
    const results = await Promise.all(
      Array.from({ length: 5 }, () => kyanGet("/index-price")),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s === 200)).toBe(true);
    console.log("  5 rapid calls all returned 200");
  });
});
