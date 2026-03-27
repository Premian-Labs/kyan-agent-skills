/**
 * REST API client for the Kyan derivatives exchange.
 *
 * Handles authentication via `x-apikey` header and optional
 * `x-one-click` header for session-based trading.
 */

// ---------------------------------------------------------------------------
// Minimal fetch type declarations (avoids requiring DOM lib)
// ---------------------------------------------------------------------------

declare function fetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KyanClientConfig {
  /** API key for authentication (sent as x-apikey header). */
  apiKey: string;
  /** Base URL of the Kyan REST API. Defaults to staging. */
  baseUrl?: string;
}

export interface RequestOptions {
  /** One-click session hash. When set, sent as x-one-click header. */
  oneClickHash?: string;
  /** Additional headers to merge into the request. */
  headers?: Record<string, string>;
}

export class KyanRateLimitError extends Error {
  constructor(
    public readonly retryAfterMs: number | undefined,
    message?: string,
  ) {
    super(
      message ??
        `Rate limit exceeded.${retryAfterMs ? ` Retry after ${retryAfterMs}ms.` : " Slow down and retry later."}`,
    );
    this.name = "KyanRateLimitError";
  }
}

export class KyanApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : JSON.stringify(body);
    super(`Kyan API error ${status}: ${msg}`);
    this.name = "KyanApiError";
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class KyanClient {
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: KyanClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://staging.kyan.sh").replace(
      /\/$/,
      "",
    );
  }

  // ── Internal fetch wrapper ───────────────────────────────────────────

  private async fetch<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
    params?: Record<string, string>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-apikey": this.apiKey,
      ...options?.headers,
    };

    if (options?.oneClickHash) {
      headers["x-one-click"] = options.oneClickHash;
    }

    const init: { method: string; headers: Record<string, string>; body?: string } = {
      method,
      headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const retryMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
      throw new KyanRateLimitError(retryMs);
    }

    // Some endpoints return 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    const json: unknown = await res.json();

    if (!res.ok) {
      throw new KyanApiError(res.status, json);
    }

    return json as T;
  }

  // ── Public HTTP helpers ──────────────────────────────────────────────

  async get<T = unknown>(
    path: string,
    params?: Record<string, string>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.fetch<T>("GET", path, undefined, options, params);
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.fetch<T>("POST", path, body, options);
  }

  async patch<T = unknown>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.fetch<T>("PATCH", path, body, options);
  }

  async delete<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.fetch<T>("DELETE", path, body, options);
  }
}
