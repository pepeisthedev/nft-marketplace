import { NFTContract } from "../types/NFTTypes";

// Network-specific NFT contracts
// Chain IDs: Hardhat (31337), Base Sepolia (84532), Base (8453)
export const NFT_CONTRACTS_BY_NETWORK: Record<number, NFTContract[]> = {
  // Hardhat local network
  31337: [
    {
      address: "0x011b5b823663C76dc70411C2be32124372464575",
      name: "Hardhat NFT Collection",
      symbol: "HNFT",
      description: "Local hardhat NFT collection",
    },
    {
      address: "0x90DF88f5c189cb3561E8da30182804Bc36F24361",
      name: "Hardhat Test Art",
      symbol: "HART",
      description: "Test art on hardhat network",
    },
  ],

  // Base Sepolia testnet
  84532: [
    {
      address: "0x0B929dbF7875c85923F14F412d64b5ee4acaF0A9", // Replace with actual Base Sepolia contract
      name: "Base Sepolia NFT",
      symbol: "BSNFT",
      description: "NFT collection on Base Sepolia testnet",
    },
  ],

  // Base mainnet
  8453: [
    {
      address: "0x0000000000000000000000000000000000000000", // Replace with actual Base contract
      name: "Base NFT Collection",
      symbol: "BNFT",
      description: "NFT collection on Base mainnet",
    },
  ],
};

// Default to hardhat contracts for backwards compatibility
export const NFT_CONTRACTS: NFTContract[] = NFT_CONTRACTS_BY_NETWORK[31337];
