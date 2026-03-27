# Explanation: Authentication Methods

> **Diataxis category:** Explanation (understanding-oriented)

## Two ways to authenticate trades

Kyan offers two authentication methods for trading operations: **individual EIP-712 signatures** and **one-click trading sessions**. Understanding when to use each is essential for building secure, ergonomic trading integrations.

## Individual EIP-712 signatures

Every state-changing operation on Kyan (placing orders, cancelling, RFQ fills) requires cryptographic proof that the request came from the wallet owner. Kyan uses EIP-712 typed data signatures for this.

With individual signing, each API request includes:
- `signature` — the EIP-712 signature over the typed message
- `signature_deadline` — a Unix timestamp bounding the signature's validity

The server verifies the signature against the maker/taker address in the message. Your private key never leaves your device.

### Why EIP-712?

EIP-712 was designed specifically for structured, human-readable signing. When a wallet prompts you to sign, it shows the field names and values rather than an opaque hash. This makes it possible to verify what you're signing before approving.

The domain separator (name "Premia", chainId, verifyingContract) prevents cross-chain and cross-contract replay attacks. A signature valid on Arbitrum Sepolia cannot be replayed on Arbitrum One.

### Replay protection

Instead of per-message nonces, Kyan uses **monotonically increasing deadlines**. Each new `signature_deadline` for a given maker must be strictly greater than the previous one. This prevents replay attacks without requiring on-chain nonce storage.

The practical implication: you cannot sign two messages with the same deadline. The 30-second validity window means you must wait at least 1 second between submissions (since deadlines are in whole seconds).

## One-click trading sessions

For active trading, signing every order individually is friction. One-click sessions let you sign once and trade freely for 24 hours.

The flow:
1. Sign a `OneClickSignature` message (deadline: 3600 seconds, much longer than the 30-second order deadline)
2. POST to `/session` — the server returns a session `hash`
3. Include the hash as the `x-one-click` HTTP header on subsequent requests
4. No individual `signature` or `signature_deadline` fields needed per order

Sessions auto-refresh their 24-hour validity window whenever you submit an order, cancel, or perform combo/RFQ operations. They can be revoked at any time via `DELETE /session`.

### The `bindToIp` option

When `bindToIp: true`, the session is tied to the IP address that created it. This prevents session hijacking if the hash is intercepted. Recommended for server-side bots with stable IPs. Not practical for mobile clients or connections behind rotating proxies.

## When to use which

| Scenario | Method | Reason |
|----------|--------|--------|
| Manual trading (occasional orders) | Individual signatures | Full control, no session management |
| Automated trading bot | One-click session | Reduced latency, no per-order signing |
| High-frequency market making | One-click session + heartbeat | Session avoids signing overhead; heartbeat provides dead man's switch |
| Security-critical operations | Individual signatures | Each action is explicitly authorized |
| Multi-user platforms | One-click session per user | Each user gets their own session hash |

## The dead man's switch

The heartbeat mechanism (`POST /heartbeat`) is an independent safety feature. When enabled, the server auto-cancels all your orders if you stop sending heartbeat pings within the configured timeout. This protects against network failures, crashed bots, or lost connections.

The heartbeat itself requires an EIP-712 signature (`HeartbeatType`) even when using one-click sessions. This is a deliberate security choice — the dead man's switch configuration should require explicit cryptographic authorization.

## See also

- [Reference: EIP-712 Signature Types](../reference/eip712-signatures.md)
- [How-to: Set up one-click sessions](../how-to/one-click-sessions.md)
- [Reference: REST API Endpoints](../reference/rest-api.md)
