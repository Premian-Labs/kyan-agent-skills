# Kyan Skills — Lessons Learned

## Patterns
- Kyan uses EIP-712 domain name "Premia" (not "Kyan") — inherited from Premia ecosystem
- All numeric values use 6-decimal precision (USDC standard)
- ARB strikes encode decimals with 'd' character (1d250 = 1.25)
- PATCH /limit creates a new order_id (v1.17.0 breaking change)
- DELETE /orders uses a 4-bucket response structure (v1.17.1)
- WebSocket account_liquidation channel exists but does NOT deliver events yet
- Signature deadlines must be monotonically increasing per maker (replay protection)
- WS auth uses API key only (no EIP-712), REST trading uses EIP-712 or one-click sessions
