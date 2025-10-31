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

/**
 * Gets all NFTs from a contract
 * Assumes token IDs are sequential starting from 0
 * Limits to first 30 NFTs to avoid long loading times
 */
export async function getNFTsFromContract(
  contractAddress: string,
  provider: BrowserProvider,
  onProgress?: (current: number, total: number) => void
): Promise<NFT[]> {
  try {
    const contract = new Contract(contractAddress, ERC721_ABI, provider);
    const totalSupply = await contract.totalSupply();
    console.log(`Total supply for contract ${contractAddress}: ${totalSupply}`);
    const nfts: NFT[] = [];
    
    // Limit to first 30 NFTs
    const maxNFTs = 30;
    const totalTokens = Math.min(Number(totalSupply), maxNFTs);

    if (totalTokens === 0) {
      return nfts;
    }

    // Fetch NFTs in batches to avoid overwhelming the RPC
    const batchSize = 5; // Reduced batch size for better stability
    let processedCount = 0;

    for (let i = 0; i < totalTokens; i += batchSize) {
      const batch = [];
      const end = Math.min(i + batchSize, totalTokens);
      
      for (let j = i; j < end; j++) {
        // Use the index directly as token ID (assumes sequential IDs starting from 0)
        batch.push(fetchNFTDataWithRetry(contract, contractAddress, j, 3));
      }

      const batchResults = await Promise.allSettled(batch);
      batchResults.forEach((result) => {
        processedCount++;
        if (result.status === "fulfilled" && result.value) {
          nfts.push(result.value);
        }
        // Report progress
        if (onProgress) {
          onProgress(processedCount, totalTokens);
        }
      });

      console.log(`Progress: ${processedCount}/${totalTokens} NFTs processed`);
    }

    console.log(`Successfully fetched ${nfts.length} out of ${totalTokens} NFTs`);
    if (Number(totalSupply) > maxNFTs) {
      console.log(`Note: Limited to first ${maxNFTs} NFTs (total supply: ${totalSupply})`);
    }
    return nfts;
  } catch (error) {
    console.error("Error fetching NFTs from contract:", error);
    throw error;
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
      // If result is null, treat it as an error and retry
      throw new Error(`fetchNFTData returned null for token ${tokenId}`);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for token ${tokenId}:`, error instanceof Error ? error.message : error);
      
      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt; // Exponential backoff: 1s, 2s, 3s
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
    // Base64 encoded: data:application/json;base64,eyJ...
    const base64Data = dataURI.split(',')[1];
    return atob(base64Data);
  } else {
    // Plain or URL-encoded: data:application/json,{...}
    const parts = dataURI.split(',');
    if (parts.length < 2) return dataURI;
    
    const data = parts.slice(1).join(','); // Handle data that might contain commas
    
    // Check if data appears to be URL-encoded by looking for encoded characters
    // If it contains %XX patterns, try to decode it
    if (/%[0-9A-Fa-f]{2}/.test(data)) {
      try {
        return decodeURIComponent(data);
      } catch (e) {
        console.warn('Failed to decode URI component, using as-is:', e);
        return data;
      }
    }
    
    // Otherwise, return the plain data as-is
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

    // Get token URI and owner
    console.log(`Fetching data for token ID ${tokenId} from contract ${contractAddress}`);
    const [tokenURI, owner] = await Promise.all([
      contract.tokenURI(tokenId, {
        gasLimit: 30000000, // 30M gas limit for complex on-chain rendering
      }),
      contract.ownerOf(tokenId),
    ]);
    console.log(`Fetched tokenURI for token ID ${tokenId}: ${tokenURI.substring(0, 100)}...`);
    
    // Decode the data URI (handles both base64 and plain encoding)
    const decodedJson = decodeDataURI(tokenURI);
    console.log(`📋 Raw tokenURI for token ${tokenId}:`, tokenURI);
    console.log(`📄 Decoded JSON for token ${tokenId}:`, decodedJson);
    
    const metadata = JSON.parse(decodedJson) as NFTMetadata;
    console.log(`✅ Parsed metadata for token ID ${tokenId}:`, JSON.stringify(metadata, null, 2));
    console.log(`🖼️ Image field type:`, typeof metadata.image);
    console.log(`🖼️ Image field value (first 200 chars):`, metadata.image?.substring(0, 200));

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
 * Gets a single NFT by token ID
 */
export async function getNFTById(
  contractAddress: string,
  tokenId: string,
  provider: BrowserProvider
): Promise<NFT> {
  try {
    const contract = new Contract(contractAddress, ERC721_ABI, provider);
    
    const [tokenURI, owner] = await Promise.all([
      contract.tokenURI(tokenId, {
        gasLimit: 30000000, // 30M gas limit for complex on-chain rendering
      }),
      contract.ownerOf(tokenId),
    ]);

    // Decode the data URI (handles both base64 and plain encoding)
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

/**
 * Gets contract info
 */
export async function getContractInfo(
  contractAddress: string,
  provider: BrowserProvider
): Promise<{ name: string; symbol: string; totalSupply: number }> {
  try {
    const contract = new Contract(contractAddress, ERC721_ABI, provider);
    
    const [name, symbol, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
    ]);

    return {
      name,
      symbol,
      totalSupply: Number(totalSupply),
    };
  } catch (error) {
    console.error("Error fetching contract info:", error);
    throw error;
  }
}
