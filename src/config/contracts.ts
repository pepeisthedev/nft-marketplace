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
      address: "0x673F91e4D811912bFC1205cC01E0fB8Ca58fE650",
      name: "Fregs",
      symbol: "FREGS",
      description: "Fregs on sepolia",
      type: "ERC721",
    },
    {
      address: "0x779E8B83dC491143eb76405ed74b35Ca74308CE0",
      name: "Fregs Items",
      symbol: "FREGITEM",
      description: "Freg items on sepolia",
      type: "ERC721",
    },
    {
      address: "0xA44bD39c7F054b7BeB4A634EE281750Bd22dfa37",
      name: "Fregs Mintpass",
      symbol: "Mintpass",
      description: "Fregs mintpass on sepolia",
      type: "ERC1155",
      tokenIds: [1], // MINT_PASS token ID = 1
    },
    {
      address: "0x0c133Ff93c750f1dA3DB10b93Cf6B9Df647F236A",
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
