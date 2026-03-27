# Kyan Skills

Agent skills and TypeScript utilities for the [Kyan.blue](https://kyan.blue) derivatives trading exchange.

Kyan is a derivatives exchange built on Arbitrum, offering options and perpetual futures on BTC, ETH, and ARB — all settled in USDC.

## Skills

| Skill | Description | Install |
|-------|-------------|---------|
| [kyan-signatures](./kyan-signatures/) | EIP-712 signature utilities for all 8 trading operation types | `npx skills add ./kyan-signatures` |
| [kyan-trading](./kyan-trading/) | REST API client for placing/managing orders, RFQ, sessions | `npx skills add ./kyan-trading` |
| [kyan-websocket](./kyan-websocket/) | WebSocket streaming client with 16 channels and session recovery | `npx skills add ./kyan-websocket` |
| [kyan-account](./kyan-account/) | Account state, collateral operations, risk monitoring, MMP | `npx skills add ./kyan-account` |
| [kyan-mcp](./kyan-mcp/) | MCP server setup for Claude Code, Claude Desktop, and Cursor | `npx skills add ./kyan-mcp` |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Kyan MCP (for AI agents)

```bash
claude mcp add kyan --transport streamable-http https://docs.kyan.blue/mcp
```

### 3. Get an API key

Contact the Premia team via [Discord](https://discord.gg/premia), email, or [premia.io](https://premia.io) to obtain an API key.

## API Endpoints

| Environment | REST API | WebSocket |
|-------------|----------|-----------|
| Staging | `https://staging.kyan.sh` | `wss://staging.kyan.sh/ws` |
| Production | `https://api.kyan.blue` | `wss://api.kyan.blue/ws` |

## Testing

### Unit tests

```bash
npm test              # 351 unit tests, no credentials needed
npm run test:watch    # Watch mode
```

### Integration tests

Integration tests hit the real staging API. They require environment variables:

```bash
# Read-only tests (market data, orderbook, instruments)
KYAN_API_KEY=your_key npm run test:integration

# Full tests including EIP-712 signing and order submission
KYAN_API_KEY=your_key WALLET_PRIVATE_KEY=your_testnet_key npm run test:integration

# All tests (unit + integration)
KYAN_API_KEY=your_key npm run test:all
```

See [How-to: Running Integration Tests](./docs/how-to/running-integration-tests.md) for details.

### Type checking

```bash
npm run typecheck     # tsc --noEmit
```

## Documentation

This project follows the [Diataxis](https://diataxis.fr) documentation framework:

| Type | Purpose | Location |
|------|---------|----------|
| **Tutorials** | Step-by-step learning | [`docs/tutorials/`](./docs/tutorials/) |
| **How-to guides** | Solve specific tasks | [`docs/how-to/`](./docs/how-to/) |
| **Reference** | Technical descriptions | [`docs/reference/`](./docs/reference/) |
| **Explanation** | Conceptual understanding | [`docs/explanation/`](./docs/explanation/) |

### Tutorials
- [Your First Trade](./docs/tutorials/01-first-trade.md)
- [Streaming Market Data](./docs/tutorials/02-websocket-streaming.md)

### How-to Guides
- [One-Click Trading Sessions](./docs/how-to/one-click-sessions.md)
- [WebSocket Channel Subscriptions](./docs/how-to/websocket-channels.md)
- [Running Integration Tests](./docs/how-to/running-integration-tests.md)

### Reference
- [EIP-712 Signature Types](./docs/reference/eip712-signatures.md)
- [REST API Endpoints](./docs/reference/rest-api.md)
- [WebSocket Events](./docs/reference/websocket-events.md)
- [Contract Addresses and Endpoints](./docs/reference/contract-addresses.md)

### Explanation
- [Portfolio Margin Model](./docs/explanation/margin-model.md)
- [Instrument Naming Conventions](./docs/explanation/instrument-naming.md)
- [Authentication Methods](./docs/explanation/authentication-methods.md)

## Architecture

```
kyan-skills/
├── shared/               # Common types, constants, utilities
├── kyan-signatures/      # EIP-712 signing (foundation)
├── kyan-trading/         # REST API client (uses signatures)
├── kyan-websocket/       # WebSocket streaming
├── kyan-account/         # Account & risk management
├── kyan-mcp/             # MCP server configuration
├── integration/          # Integration tests (requires API key)
├── docs/                 # Diataxis documentation
│   ├── tutorials/
│   ├── how-to/
│   ├── reference/
│   └── explanation/
├── tasks/                # Workflow tracking
├── scripts/              # Pre-commit sanitize audit
└── vitest.config.ts      # Test configuration
```

## Key Concepts

- **EIP-712 Signatures**: All trading operations require typed data signatures. 8 signature types cover orders, cancellations, RFQ, sessions, and heartbeat.
- **6-Decimal Precision**: All amounts and prices use USDC's 6-decimal standard via `parseUnits(value, 6)`.
- **Domain**: EIP-712 domain name is `"Premia"` (not "Kyan") — inherited from the Premia ecosystem.
- **ClearingHouseProxy**: The `verifyingContract` for EIP-712. Sepolia: `0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0`.
- **Perpetual sizing**: Dollar-notional (e.g., $10,000), not base asset units.
- **Option sizing**: Contracts (1 contract = 1 unit of base asset).

## Security

Run the 12-point sanitization audit before committing:

```bash
npm run sanitize
```

This checks for leaked API keys, private keys, secrets, tracked `.env` files, and other security issues.

## Links

- [Kyan Exchange](https://app.kyan.blue)
- [Documentation](https://docs.kyan.blue)
- [API Reference](https://docs.kyan.blue/reference)
- [Help Centre](https://help.kyan.blue)
