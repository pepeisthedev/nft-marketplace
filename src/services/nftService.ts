import { BrowserProvider, Contract } from "ethers";
import { NFT, NFTMetadata } from "../types/NFTTypes";

// Standard ERC721 ABI (without enumerable extension)
const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
];

// ERC-1155 ABI (no totalSupply or ownerOf — tokens are fungible/semi-fungible)
const ERC1155_ABI = [
  "function uri(uint256 tokenId) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
];

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  nfts: NFT[];
  timestamp: number;
}

interface TotalSupplyEntry {
  totalSupply: number;
  timestamp: number;
}

function cacheKey(contractAddress: string, chainId: number, page: number): string {
  return `nft-${contractAddress.toLowerCase()}-${chainId}-page-${page}`;
}

function totalSupplyCacheKey(contractAddress: string, chainId: number): string {
  return `nft-total-${contractAddress.toLowerCase()}-${chainId}`;
}

export function getCachedPage(contractAddress: string, chainId: number, page: number): NFT[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(contractAddress, chainId, page));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.nfts;
  } catch {
    return null;
  }
}

export function setCachedPage(contractAddress: string, chainId: number, page: number, nfts: NFT[]): void {
  try {
    const entry: CacheEntry = { nfts, timestamp: Date.now() };
    localStorage.setItem(cacheKey(contractAddress, chainId, page), JSON.stringify(entry));
  } catch (e) {
    console.warn("NFT cache write failed (localStorage quota exceeded). Clearing all NFT cache entries to free space.");
    // Clear all nft-* cache entries to free up space, then retry once
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (key.startsWith("nft-")) localStorage.removeItem(key);
    });
    try {
      const entry: CacheEntry = { nfts, timestamp: Date.now() };
      localStorage.setItem(cacheKey(contractAddress, chainId, page), JSON.stringify(entry));
    } catch {
      // Data too large to cache even after clearing — skip caching silently
    }
  }
}

export function getCachedTotalSupply(contractAddress: string, chainId: number): number | null {
  try {
    const raw = localStorage.getItem(totalSupplyCacheKey(contractAddress, chainId));
    if (!raw) return null;
    const entry: TotalSupplyEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.totalSupply;
  } catch {
    return null;
  }
}

export function setCachedTotalSupply(contractAddress: string, chainId: number, totalSupply: number): void {
  try {
    const entry: TotalSupplyEntry = { totalSupply, timestamp: Date.now() };
    localStorage.setItem(totalSupplyCacheKey(contractAddress, chainId), JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function clearContractCache(contractAddress: string, chainId: number): void {
  const prefix = `nft-${contractAddress.toLowerCase()}-${chainId}`;
  // Collect all keys first, then remove (avoid index-shift issues during iteration)
  const allKeys = Object.keys(localStorage);
  allKeys.forEach((key) => {
    if (key.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  });
  localStorage.removeItem(totalSupplyCacheKey(contractAddress, chainId));
}

/**
 * Gets a page of NFTs from a contract (ERC-721 or ERC-1155).
 * Returns the fetched NFTs and the total number of token IDs.
 */
export async function getNFTsFromContract(
  contractAddress: string,
  provider: BrowserProvider,
  options: { offset?: number; limit?: number; contractType?: "ERC721" | "ERC1155"; tokenIds?: number[] } = {},
  onProgress?: (current: number, total: number) => void
): Promise<{ nfts: NFT[]; totalSupply: number }> {
  const { offset = 0, limit = 30, contractType = "ERC721", tokenIds } = options;

  if (contractType === "ERC1155") {
    return getNFTs1155FromContract(contractAddress, provider, { offset, limit, tokenIds: tokenIds ?? [] }, onProgress);
  }

  try {
    const contract = new Contract(contractAddress, ERC721_ABI, provider);
    const totalSupplyBN = await contract.totalSupply();
    const totalSupply = Number(totalSupplyBN);

    const nfts: NFT[] = [];
    const end = Math.min(offset + limit, totalSupply);
    const tokensToFetch = end - offset;

    if (tokensToFetch <= 0) {
      return { nfts, totalSupply };
    }

    // Fetch NFTs in batches to avoid overwhelming the RPC
    const batchSize = 5;
    let processedCount = 0;

    for (let i = offset; i < end; i += batchSize) {
      const batch = [];
      const batchEnd = Math.min(i + batchSize, end);

      for (let j = i; j < batchEnd; j++) {
        batch.push(fetchNFTDataWithRetry(contract, contractAddress, j, 3));
      }

      const batchResults = await Promise.allSettled(batch);
      batchResults.forEach((result) => {
        processedCount++;
        if (result.status === "fulfilled" && result.value) {
          nfts.push(result.value);
        }
        if (onProgress) {
          onProgress(processedCount, tokensToFetch);
        }
      });

      console.log(`Progress: ${processedCount}/${tokensToFetch} NFTs processed`);
    }

    return { nfts, totalSupply };
  } catch (error) {
    console.error("Error fetching NFTs from contract:", error);
    throw error;
  }
}

/**
 * Gets a page of tokens from an ERC-1155 contract.
 * tokenIds must be provided in config since ERC-1155 has no totalSupply.
 */
async function getNFTs1155FromContract(
  contractAddress: string,
  provider: BrowserProvider,
  options: { offset: number; limit: number; tokenIds: number[] },
  onProgress?: (current: number, total: number) => void
): Promise<{ nfts: NFT[]; totalSupply: number }> {
  const { offset, limit, tokenIds } = options;
  const totalSupply = tokenIds.length;
  const pageIds = tokenIds.slice(offset, offset + limit);
  const nfts: NFT[] = [];

  if (pageIds.length === 0) {
    return { nfts, totalSupply };
  }

  try {
    const contract = new Contract(contractAddress, ERC1155_ABI, provider);
    const batchSize = 5;
    let processedCount = 0;

    for (let i = 0; i < pageIds.length; i += batchSize) {
      const batch = pageIds.slice(i, i + batchSize).map((tokenId) =>
        fetch1155NFTDataWithRetry(contract, contractAddress, tokenId, 3)
      );

      const batchResults = await Promise.allSettled(batch);
      batchResults.forEach((result) => {
        processedCount++;
        if (result.status === "fulfilled" && result.value) {
          nfts.push(result.value);
        }
        if (onProgress) {
          onProgress(processedCount, pageIds.length);
        }
      });

      console.log(`ERC-1155 progress: ${processedCount}/${pageIds.length} tokens processed`);
    }

    return { nfts, totalSupply };
  } catch (error) {
    console.error("Error fetching ERC-1155 NFTs from contract:", error);
    throw error;
  }
}

async function fetch1155NFTDataWithRetry(
  contract: Contract,
  contractAddress: string,
  tokenId: number,
  maxRetries: number
): Promise<NFT | null> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetch1155NFTData(contract, contractAddress, tokenId);
      if (result) return result;
      throw new Error(`fetch1155NFTData returned null for token ${tokenId}`);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ ERC-1155 attempt ${attempt}/${maxRetries} failed for token ${tokenId}:`, error instanceof Error ? error.message : error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error(`❌ Failed to fetch ERC-1155 token ${tokenId} after ${maxRetries} attempts:`, lastError);
  return null;
}

async function fetch1155NFTData(
  contract: Contract,
  contractAddress: string,
  tokenId: number
): Promise<NFT | null> {
  try {
    const rawUri: string = await contract.uri(tokenId, { gasLimit: 30000000 });

    // ERC-1155 URIs may contain {id} placeholder (EIP-1155 spec)
    // Replace with zero-padded hex token ID
    const paddedId = tokenId.toString(16).padStart(64, "0");
    const resolvedUri = rawUri.replace(/\{id\}/g, paddedId);

    let metadata: NFTMetadata;

    if (resolvedUri.startsWith("data:")) {
      const decodedJson = decodeDataURI(resolvedUri);
      metadata = JSON.parse(decodedJson) as NFTMetadata;
    } else {
      // HTTP/IPFS URI — fetch the metadata
      const httpUri = resolvedUri.startsWith("ipfs://")
        ? resolvedUri.replace("ipfs://", "https://ipfs.io/ipfs/")
        : resolvedUri;
      const response = await fetch(httpUri);
      metadata = await response.json();
    }

    // Resolve IPFS URIs in image and animation_url
    if (metadata.image?.startsWith("ipfs://") || metadata.animation_url?.startsWith("ipfs://")) {
      metadata = {
        ...metadata,
        image: metadata.image?.startsWith("ipfs://")
          ? metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/")
          : metadata.image,
        animation_url: metadata.animation_url?.startsWith("ipfs://")
          ? metadata.animation_url.replace("ipfs://", "https://ipfs.io/ipfs/")
          : metadata.animation_url,
      };
    }

    console.log(`Fetched ERC-1155 token ID ${tokenId}: ${metadata.name}`);

    return {
      tokenId: tokenId.toString(),
      contractAddress,
      metadata,
    };
  } catch (error) {
    console.error(`Error fetching ERC-1155 token ID ${tokenId}:`, error);
    return null;
  }
}

/**
 * Fetches NFT data with retry logic
 */
async function fetchNFTDataWithRetry(
  contract: Contract,
  contractAddress: string,
  tokenId: number,
  maxRetries: number = 3
): Promise<NFT | null> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchNFTData(contract, contractAddress, tokenId);
      if (result) {
        if (attempt > 1) {
          console.log(`✅ Successfully fetched token ${tokenId} on attempt ${attempt}`);
        }
        return result;
      }
      throw new Error(`fetchNFTData returned null for token ${tokenId}`);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for token ${tokenId}:`, error instanceof Error ? error.message : error);

      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt;
        console.log(`   Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`❌ Failed to fetch token ${tokenId} after ${maxRetries} attempts. Last error:`, lastError);
  return null;
}

/**
 * Decode a data URI (handles base64, URL-encoded, and plain formats)
 */
function decodeDataURI(dataURI: string): string {
  if (dataURI.includes(';base64,')) {
    const base64Data = dataURI.split(',')[1];
    return atob(base64Data);
  } else {
    const parts = dataURI.split(',');
    if (parts.length < 2) return dataURI;

    const data = parts.slice(1).join(',');

    if (/%[0-9A-Fa-f]{2}/.test(data)) {
      try {
        return decodeURIComponent(data);
      } catch (e) {
        console.warn('Failed to decode URI component, using as-is:', e);
        return data;
      }
    }

    return data;
  }
}

/**
 * Fetches data for a single NFT by token ID
 */
async function fetchNFTData(
  contract: Contract,
  contractAddress: string,
  tokenId: number
): Promise<NFT | null> {
  try {
    const tokenIdString = tokenId.toString();

    const [tokenURI, owner] = await Promise.all([
      contract.tokenURI(tokenId, {
        gasLimit: 30000000,
      }),
      contract.ownerOf(tokenId),
    ]);
    console.log(`Fetched tokenURI for token ID ${tokenId}: ${tokenURI.substring(0, 100)}...`);

    const decodedJson = decodeDataURI(tokenURI);
    const metadata = JSON.parse(decodedJson) as NFTMetadata;

    return {
      tokenId: tokenIdString,
      contractAddress,
      owner,
      metadata,
    };
  } catch (error) {
    console.error(`Error fetching NFT with token ID ${tokenId}:`, error);
    return null;
  }
}

/**
 * Gets a single NFT by token ID (ERC-721 or ERC-1155)
 */
export async function getNFTById(
  contractAddress: string,
  tokenId: string,
  provider: BrowserProvider,
  contractType: "ERC721" | "ERC1155" = "ERC721"
): Promise<NFT> {
  if (contractType === "ERC1155") {
    const contract = new Contract(contractAddress, ERC1155_ABI, provider);
    const result = await fetch1155NFTData(contract, contractAddress, Number(tokenId));
    if (!result) throw new Error(`Failed to fetch ERC-1155 token ${tokenId}`);
    return result;
  }

  try {
    const contract = new Contract(contractAddress, ERC721_ABI, provider);

    const [tokenURI, owner] = await Promise.all([
      contract.tokenURI(tokenId, {
        gasLimit: 30000000,
      }),
      contract.ownerOf(tokenId),
    ]);

    const decodedJson = decodeDataURI(tokenURI);
    const metadata = JSON.parse(decodedJson) as NFTMetadata;

    return {
      tokenId,
      contractAddress,
      owner,
      metadata,
    };
  } catch (error) {
    console.error("Error fetching NFT:", error);
    throw error;
  }
}

const OPTIONAL_METADATA_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
];

/**
 * Gets contract info. Works for both ERC-721 and ERC-1155.
 * ERC-1155 contracts may not have name/symbol/totalSupply — falls back gracefully.
 */
export async function getContractInfo(
  contractAddress: string,
  provider: BrowserProvider
): Promise<{ name: string; symbol: string; totalSupply: number }> {
  const contract = new Contract(contractAddress, OPTIONAL_METADATA_ABI, provider);

  const [name, symbol, totalSupply] = await Promise.allSettled([
    contract.name(),
    contract.symbol(),
    contract.totalSupply(),
  ]);

  return {
    name: name.status === "fulfilled" ? name.value : "",
    symbol: symbol.status === "fulfilled" ? symbol.value : "",
    totalSupply: totalSupply.status === "fulfilled" ? Number(totalSupply.value) : 0,
  };
}
