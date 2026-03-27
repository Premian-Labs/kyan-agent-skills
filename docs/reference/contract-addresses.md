# Reference: Contract Addresses and Endpoints

> **Diataxis category:** Reference (information-oriented)

## Arbitrum Sepolia Testnet (Chain ID: 421614)

| Contract | Address |
|----------|---------|
| ClearingHouseProxy | `0x746EE6b2689D56d9D593BC1bB733b48BfD4908D0` |
| ClearingHouseImplementation | `0x9851F23AB63b9a095b59840E1e6D6415D32F9f01` |
| Mock USDC (faucet) | `0x07a7D6b723d0aa62cD78da00452Ba3cD3b72C3d7` |
| KyanUSDC | `0xA4387E780091cA2C479F71Bf5AC0cF729098c0C3` |

## Arbitrum One Mainnet (Chain ID: 42161)

Mainnet contract addresses will be published prior to production launch. Check the [Kyan docs](https://docs.kyan.blue/docs/smart-contracts) for the latest.

## API Endpoints

| Environment | REST API | WebSocket |
|-------------|----------|-----------|
| Staging | `https://staging.kyan.sh` | `wss://staging.kyan.sh/ws` |
| Production | `https://api.kyan.blue` | `wss://api.kyan.blue/ws` |

## MCP Server

| URL | Transport |
|-----|-----------|
| `https://docs.kyan.blue/mcp` | Streamable HTTP |

## EIP-712 Domain

The `verifyingContract` field in the EIP-712 domain is the **ClearingHouseProxy** address for the target chain.

| Field | Value |
|-------|-------|
| `name` | `"Premia"` |
| `version` | `"1"` |
| `chainId` | `421614` (Sepolia) or `42161` (mainnet) |
| `verifyingContract` | ClearingHouseProxy address (see table above) |

## See also

- [Tutorial: Your First Trade](../tutorials/01-first-trade.md)
- [Reference: EIP-712 Signature Types](./eip712-signatures.md)
- [Explanation: Instrument Naming](../explanation/instrument-naming.md)
