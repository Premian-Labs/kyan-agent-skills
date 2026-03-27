import type { Address } from "viem";

/**
 * Supported chain IDs for the Kyan exchange.
 */
export const SUPPORTED_CHAIN_IDS = {
  ARBITRUM_SEPOLIA: 421614,
  ARBITRUM_ONE: 42161,
} as const;

export type SupportedChainId =
  (typeof SUPPORTED_CHAIN_IDS)[keyof typeof SUPPORTED_CHAIN_IDS];

/**
 * EIP-712 domain separator for Kyan (inherited from Premia ecosystem).
 *
 * The domain name is "Premia" because the Kyan exchange is built on the
 * Premia protocol's smart contract infrastructure. The verifyingContract
 * is the ClearingHouseProxy address deployed on the target chain.
 */
export interface KyanEIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

/**
 * Create the EIP-712 domain separator object for signing operations.
 *
 * @param chainId - The chain ID (421614 for Arbitrum Sepolia, 42161 for Arbitrum One)
 * @param verifyingContract - The ClearingHouseProxy contract address on the target chain
 * @returns The EIP-712 domain object compatible with viem's signTypedData
 */
export function createEIP712Domain(
  chainId: SupportedChainId | number,
  verifyingContract: Address
): KyanEIP712Domain {
  return {
    name: "Premia",
    version: "1",
    chainId,
    verifyingContract,
  };
}
