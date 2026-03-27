import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import {
  KyanClient,
  KyanRateLimitError,
  KyanApiError,
  type RequestOptions,
} from "../client.js";

import {
  postLimitOrders,
  editLimitOrder,
  postMarketOrder,
  postComboOrder,
  type SignatureData,
} from "../orders.js";

import { cancelOrders, cancelAllOrders } from "../cancel.js";

import {
  submitRFQRequest,
  getRFQRequests,
  submitRFQResponse,
  getRFQResponses,
  fillRFQ,
} from "../rfq.js";

import { createSession, revokeSession, postHeartbeat } from "../session.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const TEST_API_KEY = "test-api-key-abc123";
const TEST_BASE_URL = "https://api.kyan.sh";
const MAKER_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

const SIGNATURE_DATA: SignatureData = {
  signature: "0xdeadbeef",
  signature_deadline: 1700000000,
};

/** Build a mock Response-like object for the global fetch mock. */
function mockResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json: () => Promise<unknown>;
} {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    json: () => Promise.resolve(body),
  };
}

/** Convenience to extract the init arg from the most recent fetch call. */
function lastFetchInit(): {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
} {
  const mockFetch = globalThis.fetch as unknown as Mock;
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1]![1];
}

/** Convenience to extract the URL string from the most recent fetch call. */
function lastFetchUrl(): string {
  const mockFetch = globalThis.fetch as unknown as Mock;
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1]![0];
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let fetchMock: Mock;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

// ==========================================================================
// client.ts  --  KyanClient
// ==========================================================================

describe("KyanClient", () => {
  // --------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------

  describe("constructor", () => {
    it("uses the default staging base URL when none is provided", () => {
      const client = new KyanClient({ apiKey: TEST_API_KEY });
      expect(client.baseUrl).toBe("https://staging.kyan.sh");
    });

    it("uses a custom base URL when provided", () => {
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });
      expect(client.baseUrl).toBe(TEST_BASE_URL);
    });

    it("strips a trailing slash from the base URL", () => {
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: "https://api.kyan.sh/",
      });
      expect(client.baseUrl).toBe("https://api.kyan.sh");
    });

    it("strips a trailing slash from the default URL", () => {
      // Edge case: verify default also gets slash-stripped (it doesn't have one,
      // but the logic is the same -- ensure no regression).
      const client = new KyanClient({ apiKey: TEST_API_KEY });
      expect(client.baseUrl).not.toMatch(/\/$/);
    });
  });

  // --------------------------------------------------------------------
  // Headers
  // --------------------------------------------------------------------

  describe("headers", () => {
    it("always sends the x-apikey header", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test");

      const init = lastFetchInit();
      expect(init.headers?.["x-apikey"]).toBe(TEST_API_KEY);
    });

    it("sends Content-Type: application/json", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test");

      const init = lastFetchInit();
      expect(init.headers?.["Content-Type"]).toBe("application/json");
    });

    it("sets x-one-click header when oneClickHash is provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test", undefined, { oneClickHash: "session-hash-xyz" });

      const init = lastFetchInit();
      expect(init.headers?.["x-one-click"]).toBe("session-hash-xyz");
    });

    it("does not set x-one-click header when oneClickHash is not provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test");

      const init = lastFetchInit();
      expect(init.headers?.["x-one-click"]).toBeUndefined();
    });

    it("merges additional headers from options", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test", undefined, {
        headers: { "x-custom": "custom-value" },
      });

      const init = lastFetchInit();
      expect(init.headers?.["x-custom"]).toBe("custom-value");
    });
  });

  // --------------------------------------------------------------------
  // GET
  // --------------------------------------------------------------------

  describe("get()", () => {
    it("sends a GET request to the correct URL", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ data: 1 }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/some/path");

      expect(lastFetchUrl()).toBe("https://api.kyan.sh/some/path");
      expect(lastFetchInit().method).toBe("GET");
    });

    it("appends query string params when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ data: 1 }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/orders", { maker: MAKER_ADDRESS, status: "open" });

      const url = lastFetchUrl();
      expect(url).toContain("?");
      expect(url).toContain("maker=" + encodeURIComponent(MAKER_ADDRESS));
      expect(url).toContain("status=open");
    });

    it("does not append a query string when params are not provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ data: 1 }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test");

      expect(lastFetchUrl()).toBe("https://api.kyan.sh/test");
      expect(lastFetchUrl()).not.toContain("?");
    });

    it("does not send a body for GET requests", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ data: 1 }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.get("/test");

      expect(lastFetchInit().body).toBeUndefined();
    });

    it("returns parsed JSON response", async () => {
      const expectedData = { orders: [{ id: "1" }] };
      fetchMock.mockResolvedValueOnce(mockResponse(expectedData));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const result = await client.get("/orders");
      expect(result).toEqual(expectedData);
    });
  });

  // --------------------------------------------------------------------
  // POST
  // --------------------------------------------------------------------

  describe("post()", () => {
    it("sends a POST request with JSON body", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ id: "new" }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });
      const payload = { name: "test", value: 42 };

      await client.post("/resource", payload);

      expect(lastFetchInit().method).toBe("POST");
      expect(lastFetchInit().body).toBe(JSON.stringify(payload));
    });
  });

  // --------------------------------------------------------------------
  // PATCH
  // --------------------------------------------------------------------

  describe("patch()", () => {
    it("sends a PATCH request with JSON body", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ updated: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });
      const payload = { price: 100 };

      await client.patch("/resource/1", payload);

      expect(lastFetchInit().method).toBe("PATCH");
      expect(lastFetchInit().body).toBe(JSON.stringify(payload));
    });
  });

  // --------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------

  describe("delete()", () => {
    it("sends a DELETE request with a body when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ deleted: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });
      const payload = { id: "abc" };

      await client.delete("/resource", payload);

      expect(lastFetchInit().method).toBe("DELETE");
      expect(lastFetchInit().body).toBe(JSON.stringify(payload));
    });

    it("sends a DELETE request without a body when none is provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ deleted: true }));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      await client.delete("/resource");

      expect(lastFetchInit().method).toBe("DELETE");
      expect(lastFetchInit().body).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------
  // Error handling
  // --------------------------------------------------------------------

  describe("error handling", () => {
    it("throws KyanRateLimitError on HTTP 429 with retry-after header", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(
          { error: "rate limited" },
          429,
          { "retry-after": "5" }, // 5 seconds
        ),
      );
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const err = await client.get("/test").catch((e: unknown) => e);

      expect(err).toBeInstanceOf(KyanRateLimitError);
      const rateLimitErr = err as KyanRateLimitError;
      expect(rateLimitErr.retryAfterMs).toBe(5000);
      expect(rateLimitErr.name).toBe("KyanRateLimitError");
      expect(rateLimitErr.message).toContain("5000ms");
    });

    it("throws KyanRateLimitError on HTTP 429 without retry-after header", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({ error: "rate limited" }, 429),
      );
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const err = await client.get("/test").catch((e: unknown) => e);

      expect(err).toBeInstanceOf(KyanRateLimitError);
      const rateLimitErr = err as KyanRateLimitError;
      expect(rateLimitErr.retryAfterMs).toBeUndefined();
      expect(rateLimitErr.message).toContain("Slow down");
    });

    it("returns undefined for HTTP 204 No Content", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(null, 204));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const result = await client.delete("/resource/1");
      expect(result).toBeUndefined();
    });

    it("throws KyanApiError for non-ok responses (e.g. 400)", async () => {
      const errorBody = { error: "Invalid order format" };
      fetchMock.mockResolvedValueOnce(mockResponse(errorBody, 400));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const err = await client.post("/limit", {}).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(KyanApiError);
      const apiErr = err as KyanApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.body).toEqual(errorBody);
      expect(apiErr.name).toBe("KyanApiError");
      expect(apiErr.message).toContain("Invalid order format");
    });

    it("throws KyanApiError for 500 with non-object body", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse("internal error", 500));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const err = await client.get("/test").catch((e: unknown) => e);

      expect(err).toBeInstanceOf(KyanApiError);
      const apiErr = err as KyanApiError;
      expect(apiErr.status).toBe(500);
      expect(apiErr.message).toContain("500");
    });

    it("KyanApiError extracts error message from body.error field", async () => {
      const errorBody = { error: "INSUFFICIENT_MARGIN" };
      fetchMock.mockResolvedValueOnce(mockResponse(errorBody, 422));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const err = await client.post("/market", {}).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(KyanApiError);
      expect((err as KyanApiError).message).toBe(
        "Kyan API error 422: INSUFFICIENT_MARGIN",
      );
    });

    it("KyanApiError falls back to JSON.stringify when body has no error field", async () => {
      const errorBody = { detail: "something went wrong" };
      fetchMock.mockResolvedValueOnce(mockResponse(errorBody, 400));
      const client = new KyanClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      const err = await client.post("/test", {}).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(KyanApiError);
      expect((err as KyanApiError).message).toContain(JSON.stringify(errorBody));
    });
  });

  // --------------------------------------------------------------------
  // KyanRateLimitError standalone
  // --------------------------------------------------------------------

  describe("KyanRateLimitError", () => {
    it("has correct name property", () => {
      const err = new KyanRateLimitError(1000);
      expect(err.name).toBe("KyanRateLimitError");
    });

    it("includes retryAfterMs in message when provided", () => {
      const err = new KyanRateLimitError(3000);
      expect(err.message).toContain("3000ms");
    });

    it("uses fallback message when retryAfterMs is undefined", () => {
      const err = new KyanRateLimitError(undefined);
      expect(err.message).toContain("Slow down and retry later");
    });

    it("uses custom message when provided", () => {
      const err = new KyanRateLimitError(1000, "Custom rate limit message");
      expect(err.message).toBe("Custom rate limit message");
    });
  });

  // --------------------------------------------------------------------
  // KyanApiError standalone
  // --------------------------------------------------------------------

  describe("KyanApiError", () => {
    it("has correct name property", () => {
      const err = new KyanApiError(400, { error: "bad" });
      expect(err.name).toBe("KyanApiError");
    });

    it("stores status and body", () => {
      const body = { error: "test" };
      const err = new KyanApiError(403, body);
      expect(err.status).toBe(403);
      expect(err.body).toBe(body);
    });

    it("extracts error string from body.error", () => {
      const err = new KyanApiError(400, { error: "ORDER_NOT_FOUND" });
      expect(err.message).toBe("Kyan API error 400: ORDER_NOT_FOUND");
    });

    it("stringifies body when there is no error field", () => {
      const body = { msg: "oops" };
      const err = new KyanApiError(500, body);
      expect(err.message).toBe(`Kyan API error 500: ${JSON.stringify(body)}`);
    });

    it("handles null body", () => {
      const err = new KyanApiError(500, null);
      expect(err.message).toBe("Kyan API error 500: null");
    });
  });
});

// ==========================================================================
// orders.ts
// ==========================================================================

describe("orders", () => {
  let client: KyanClient;

  beforeEach(() => {
    client = new KyanClient({ apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL });
  });

  // --------------------------------------------------------------------
  // postLimitOrders
  // --------------------------------------------------------------------

  describe("postLimitOrders", () => {
    const limitResponse = {
      posted: [
        {
          order_id: "ord-1",
          instrument_name: "ETH-PERP",
          direction: "buy",
          price: 3000,
          contracts: 10,
        },
      ],
      rejected: [],
    };

    it("sends POST /limit with orders array", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(limitResponse));

      const orders = [
        {
          instrument_name: "ETH-PERP",
          direction: "buy",
          price: 3000,
          contracts: 10,
        },
      ] as any[];

      const result = await postLimitOrders(client, orders);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/limit`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.orders).toEqual(orders);
      expect(body.signature).toBeUndefined();
      expect(result).toEqual(limitResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(limitResponse));

      await postLimitOrders(client, [], SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
    });

    it("passes request options (oneClickHash) through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(limitResponse));

      await postLimitOrders(client, [], undefined, {
        oneClickHash: "sess-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("sess-hash");
    });
  });

  // --------------------------------------------------------------------
  // editLimitOrder
  // --------------------------------------------------------------------

  describe("editLimitOrder", () => {
    const editResponse = {
      posted: [
        {
          order_id: "ord-2",
          instrument_name: "ETH-PERP",
          direction: "buy",
          price: 3100,
          contracts: 5,
        },
      ],
      rejected: [],
    };

    it("sends PATCH /limit with order_id and updates", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(editResponse));

      const result = await editLimitOrder(client, "ord-1", { price: 3100 });

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/limit`);
      expect(lastFetchInit().method).toBe("PATCH");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.order_id).toBe("ord-1");
      expect(body.price).toBe(3100);
      expect(result).toEqual(editResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(editResponse));

      await editLimitOrder(client, "ord-1", { contracts: 20 }, SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
      expect(body.contracts).toBe(20);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(editResponse));

      await editLimitOrder(client, "ord-1", { price: 100 }, undefined, {
        oneClickHash: "hash-abc",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("hash-abc");
    });
  });

  // --------------------------------------------------------------------
  // postMarketOrder
  // --------------------------------------------------------------------

  describe("postMarketOrder", () => {
    const marketResponse = {
      trade_id: "trade-1",
      instrument_name: "ETH-PERP",
      direction: "buy",
      price: 3050,
      contracts: 5,
    };

    it("sends POST /market with trade payload", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(marketResponse));

      const trade = {
        instrument_name: "ETH-PERP",
        direction: "buy",
        contracts: 5,
      } as any;

      const result = await postMarketOrder(client, trade);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/market`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.instrument_name).toBe("ETH-PERP");
      expect(body.direction).toBe("buy");
      expect(body.contracts).toBe(5);
      expect(result).toEqual(marketResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(marketResponse));

      const trade = {
        instrument_name: "BTC-PERP",
        direction: "sell",
        contracts: 1,
      } as any;

      await postMarketOrder(client, trade, SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
    });
  });

  // --------------------------------------------------------------------
  // postComboOrder
  // --------------------------------------------------------------------

  describe("postComboOrder", () => {
    const comboResponse = {
      trade_id: "combo-1",
      legs: [
        {
          instrument_name: "ETH-20250101-3000-C",
          direction: "buy",
          price: 100,
          contracts: 1,
        },
        {
          instrument_name: "ETH-20250101-3500-C",
          direction: "sell",
          price: 50,
          contracts: 1,
        },
      ],
      total_net_premium: -50,
    };

    it("sends POST /combo with legs and premiums", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(comboResponse));

      const combo = {
        legs: [
          {
            instrument_name: "ETH-20250101-3000-C",
            direction: "buy",
            contracts: 1,
          },
          {
            instrument_name: "ETH-20250101-3500-C",
            direction: "sell",
            contracts: 1,
          },
        ],
      } as any;

      const result = await postComboOrder(client, combo);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/combo`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.legs).toEqual(combo.legs);
      expect(result).toEqual(comboResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(comboResponse));

      const combo = { legs: [] } as any;
      await postComboOrder(client, combo, SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(comboResponse));

      const combo = { legs: [] } as any;
      await postComboOrder(client, combo, undefined, {
        oneClickHash: "combo-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("combo-hash");
    });
  });
});

// ==========================================================================
// cancel.ts
// ==========================================================================

describe("cancel", () => {
  let client: KyanClient;

  beforeEach(() => {
    client = new KyanClient({ apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL });
  });

  // --------------------------------------------------------------------
  // cancelOrders
  // --------------------------------------------------------------------

  describe("cancelOrders", () => {
    const cancelResponse = {
      orders_cancelled: ["ord-1"],
      orders_pending_cancel: [],
      rejected_cancellations: [],
      orders_not_found: [],
    };

    it("sends DELETE /orders with maker and order_ids", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelResponse));

      const result = await cancelOrders(client, MAKER_ADDRESS, ["ord-1", "ord-2"]);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/orders`);
      expect(lastFetchInit().method).toBe("DELETE");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.maker).toBe(MAKER_ADDRESS);
      expect(body.order_ids).toEqual(["ord-1", "ord-2"]);
      expect(result).toEqual(cancelResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelResponse));

      await cancelOrders(client, MAKER_ADDRESS, ["ord-1"], SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
    });

    it("does not include signature fields when signatureData is omitted", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelResponse));

      await cancelOrders(client, MAKER_ADDRESS, ["ord-1"]);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBeUndefined();
      expect(body.signature_deadline).toBeUndefined();
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelResponse));

      await cancelOrders(client, MAKER_ADDRESS, ["ord-1"], undefined, {
        oneClickHash: "cancel-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("cancel-hash");
    });
  });

  // --------------------------------------------------------------------
  // cancelAllOrders
  // --------------------------------------------------------------------

  describe("cancelAllOrders", () => {
    const cancelAllResponse = {
      orders_cancelled: ["ord-1", "ord-2"],
      orders_pending_cancel: ["ord-3"],
    };

    it("sends DELETE /orders_all with maker", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelAllResponse));

      const result = await cancelAllOrders(client, MAKER_ADDRESS);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/orders_all`);
      expect(lastFetchInit().method).toBe("DELETE");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.maker).toBe(MAKER_ADDRESS);
      expect(result).toEqual(cancelAllResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelAllResponse));

      await cancelAllOrders(client, MAKER_ADDRESS, SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(cancelAllResponse));

      await cancelAllOrders(client, MAKER_ADDRESS, undefined, {
        oneClickHash: "cancel-all-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("cancel-all-hash");
    });
  });
});

// ==========================================================================
// rfq.ts
// ==========================================================================

describe("rfq", () => {
  let client: KyanClient;

  beforeEach(() => {
    client = new KyanClient({ apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL });
  });

  // --------------------------------------------------------------------
  // submitRFQRequest
  // --------------------------------------------------------------------

  describe("submitRFQRequest", () => {
    const rfqRequestResponse = {
      request_id: "rfq-req-1",
      legs: [
        {
          instrument_name: "ETH-20250101-3000-C",
          direction: "buy",
          contracts: 10,
        },
      ],
      created_at: "2025-01-01T00:00:00Z",
    };

    it("sends POST /rfq/request with legs", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqRequestResponse));

      const payload = {
        legs: [
          {
            instrument_name: "ETH-20250101-3000-C",
            direction: "buy",
            contracts: 10,
          },
        ],
      } as any;

      const result = await submitRFQRequest(client, payload);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/rfq/request`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.legs).toEqual(payload.legs);
      expect(result).toEqual(rfqRequestResponse);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqRequestResponse));

      await submitRFQRequest(client, { legs: [] as any[] }, {
        oneClickHash: "rfq-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("rfq-hash");
    });
  });

  // --------------------------------------------------------------------
  // getRFQRequests
  // --------------------------------------------------------------------

  describe("getRFQRequests", () => {
    const rfqRequestsResponse = [
      {
        request_id: "rfq-req-1",
        legs: [],
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    it("sends GET /rfq/requests", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqRequestsResponse));

      const result = await getRFQRequests(client);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/rfq/requests`);
      expect(lastFetchInit().method).toBe("GET");
      expect(lastFetchInit().body).toBeUndefined();
      expect(result).toEqual(rfqRequestsResponse);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqRequestsResponse));

      await getRFQRequests(client, { oneClickHash: "rfq-get-hash" });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("rfq-get-hash");
    });
  });

  // --------------------------------------------------------------------
  // submitRFQResponse
  // --------------------------------------------------------------------

  describe("submitRFQResponse", () => {
    const rfqResponseEntry = {
      response_id: "rfq-resp-1",
      request_id: "rfq-req-1",
      legs: [
        {
          instrument_name: "ETH-20250101-3000-C",
          direction: "buy",
          price: 150,
          contracts: 10,
        },
      ],
      created_at: "2025-01-01T00:05:00Z",
    };

    it("sends POST /rfq/response with response payload", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqResponseEntry));

      const payload = {
        request_id: "rfq-req-1",
        legs: [
          {
            instrument_name: "ETH-20250101-3000-C",
            direction: "buy",
            price: 150,
            contracts: 10,
          },
        ],
      } as any;

      const result = await submitRFQResponse(client, payload);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/rfq/response`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.request_id).toBe("rfq-req-1");
      expect(body.legs).toEqual(payload.legs);
      expect(result).toEqual(rfqResponseEntry);
    });
  });

  // --------------------------------------------------------------------
  // getRFQResponses
  // --------------------------------------------------------------------

  describe("getRFQResponses", () => {
    const rfqResponsesResult = [
      {
        response_id: "rfq-resp-1",
        request_id: "rfq-req-1",
        legs: [],
        created_at: "2025-01-01T00:05:00Z",
      },
    ];

    it("sends GET /rfq/responses", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqResponsesResult));

      const result = await getRFQResponses(client);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/rfq/responses`);
      expect(lastFetchInit().method).toBe("GET");
      expect(lastFetchInit().body).toBeUndefined();
      expect(result).toEqual(rfqResponsesResult);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(rfqResponsesResult));

      await getRFQResponses(client, { oneClickHash: "resp-hash" });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("resp-hash");
    });
  });

  // --------------------------------------------------------------------
  // fillRFQ
  // --------------------------------------------------------------------

  describe("fillRFQ", () => {
    const fillResponse = { trade_id: "fill-trade-1" };

    it("sends POST /rfq/fill with taker and response_id", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(fillResponse));

      const result = await fillRFQ(client, MAKER_ADDRESS, "rfq-resp-1");

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/rfq/fill`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.taker).toBe(MAKER_ADDRESS);
      expect(body.response_id).toBe("rfq-resp-1");
      expect(result).toEqual(fillResponse);
    });

    it("includes signature data when provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(fillResponse));

      await fillRFQ(client, MAKER_ADDRESS, "rfq-resp-1", SIGNATURE_DATA);

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
    });

    it("does not include signature fields when signatureData is omitted", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(fillResponse));

      await fillRFQ(client, MAKER_ADDRESS, "rfq-resp-1");

      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBeUndefined();
      expect(body.signature_deadline).toBeUndefined();
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(fillResponse));

      await fillRFQ(client, MAKER_ADDRESS, "rfq-resp-1", undefined, {
        oneClickHash: "fill-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("fill-hash");
    });
  });
});

// ==========================================================================
// session.ts
// ==========================================================================

describe("session", () => {
  let client: KyanClient;

  beforeEach(() => {
    client = new KyanClient({ apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL });
  });

  // --------------------------------------------------------------------
  // createSession
  // --------------------------------------------------------------------

  describe("createSession", () => {
    const sessionResponse = { hash: "session-hash-abc123" };

    it("sends POST /session with signature data", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(sessionResponse));

      const result = await createSession(client, SIGNATURE_DATA);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/session`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
      expect(result).toEqual(sessionResponse);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(sessionResponse));

      await createSession(client, SIGNATURE_DATA, {
        headers: { "x-extra": "val" },
      });

      expect(lastFetchInit().headers?.["x-extra"]).toBe("val");
    });
  });

  // --------------------------------------------------------------------
  // revokeSession
  // --------------------------------------------------------------------

  describe("revokeSession", () => {
    const revokeResponse = { revokedSessions: 1 };

    it("sends DELETE /session without body", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(revokeResponse));

      const result = await revokeSession(client);

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/session`);
      expect(lastFetchInit().method).toBe("DELETE");
      expect(lastFetchInit().body).toBeUndefined();
      expect(result).toEqual(revokeResponse);
    });

    it("sets x-one-click header when sessionHash is provided", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(revokeResponse));

      await revokeSession(client, "revoke-this-session");

      expect(lastFetchInit().headers?.["x-one-click"]).toBe(
        "revoke-this-session",
      );
    });

    it("does not set x-one-click header when sessionHash is omitted (revoke all)", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(revokeResponse));

      await revokeSession(client);

      expect(lastFetchInit().headers?.["x-one-click"]).toBeUndefined();
    });

    it("merges sessionHash with existing options", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(revokeResponse));

      await revokeSession(client, "specific-session", {
        headers: { "x-custom": "test" },
      });

      const init = lastFetchInit();
      expect(init.headers?.["x-one-click"]).toBe("specific-session");
      expect(init.headers?.["x-custom"]).toBe("test");
    });
  });

  // --------------------------------------------------------------------
  // postHeartbeat
  // --------------------------------------------------------------------

  describe("postHeartbeat", () => {
    const heartbeatResponse = { success: true };

    it("sends POST /heartbeat with maker, timeout, and signature", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(heartbeatResponse));

      const result = await postHeartbeat(
        client,
        MAKER_ADDRESS,
        30,
        SIGNATURE_DATA,
      );

      expect(lastFetchUrl()).toBe(`${TEST_BASE_URL}/heartbeat`);
      expect(lastFetchInit().method).toBe("POST");
      const body = JSON.parse(lastFetchInit().body!);
      expect(body.maker).toBe(MAKER_ADDRESS);
      expect(body.timeout).toBe(30);
      expect(body.signature).toBe(SIGNATURE_DATA.signature);
      expect(body.signature_deadline).toBe(SIGNATURE_DATA.signature_deadline);
      expect(result).toEqual(heartbeatResponse);
    });

    it("passes request options through", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(heartbeatResponse));

      await postHeartbeat(client, MAKER_ADDRESS, 60, SIGNATURE_DATA, {
        oneClickHash: "heartbeat-hash",
      });

      expect(lastFetchInit().headers?.["x-one-click"]).toBe("heartbeat-hash");
    });
  });
});
