import { NFTContract } from "../types/NFTTypes";

// Network-specific NFT contracts
// Chain IDs: Hardhat (31337), Base Sepolia (84532), Base (8453)
//
// ERC-1155 contracts must include:
//   type: "ERC1155"
//   tokenIds: [0, 1, 2, ...]  — the token IDs to display (ERC-1155 has no totalSupply)
export const NFT_CONTRACTS_BY_NETWORK: Record<number, NFTContract[]> = {
  // Hardhat local network
  31337: [
    {
      address: "0x011b5b823663C76dc70411C2be32124372464575",
      name: "Hardhat NFT Collection",
      symbol: "HNFT",
      description: "Local hardhat NFT collection",
      type: "ERC721",
    },
    {
      address: "0x90DF88f5c189cb3561E8da30182804Bc36F24361",
      name: "Hardhat Test Art",
      symbol: "HART",
      description: "Test art on hardhat network",
      type: "ERC721",
    },
  ],

  // Base Sepolia testnet
  84532: [
    {
      address: "0xaEf8342D03a547115Ad1496954DD8E2D815de6a4",
      name: "Fregs",
      symbol: "FREGS",
      description: "Fregs on sepolia",
      type: "ERC721",
    },
    {
      address: "0x45AD572718BeDe49CEE3565b02AA21F9a812D672",
      name: "Fregs Items",
      symbol: "FREGITEM",
      description: "Freg items on sepolia",
      type: "ERC721",
    },
    {
      address: "0xF0848a7FC1fE2d0B34ec4AfC95423F7eB73168e0",
      name: "Fregs Mintpass",
      symbol: "Mintpass",
      description: "Fregs mintpass on sepolia",
      type: "ERC1155",
      tokenIds: [1], // MINT_PASS token ID = 1
    },
    {
      address: "0xAE35969e1Df2E3E738C3c1514a692b23a7096654",
      name: "FregSpinToken",
      symbol: "FREGSPIN",
      description: "Fregs spin token on sepolia",
      type: "ERC1155",
      tokenIds: [1], // SPIN_TOKEN token ID = 1
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
