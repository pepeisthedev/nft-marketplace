export interface NFTContract {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  name: string;
  description?: string;
  image: string;
  attributes?: NFTAttribute[];
  external_url?: string;
  animation_url?: string;
  background_color?: string;
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  owner?: string;
  metadata: NFTMetadata;
}

export interface FilterOption {
  trait_type: string;
  values: Set<string | number>;
}

export interface ActiveFilters {
  [trait_type: string]: Set<string | number>;
}
