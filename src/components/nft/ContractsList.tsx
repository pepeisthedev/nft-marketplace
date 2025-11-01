import React from "react";
import { NFTContract } from "../../types/NFTTypes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

/**
 * Ensures a data URI is properly formatted for use in HTML attributes
 * If the SVG data is not URL-encoded, this will encode it
 */
function ensureEncodedDataURI(dataURI: string): string {
  // If it's base64, return as-is
  if (dataURI.includes(';base64,')) {
    return dataURI;
  }
  
  // For plain SVG data URIs, we need to encode the SVG content
  const parts = dataURI.split(',');
  if (parts.length < 2) return dataURI;
  
  const mimeType = parts[0]; // e.g., "data:image/svg+xml"
  const svgContent = parts.slice(1).join(',');
  
  // Check if it's already URL-encoded (contains %XX patterns)
  if (/%[0-9A-Fa-f]{2}/.test(svgContent)) {
    return dataURI; // Already encoded
  }
  
  // Encode the SVG content
  const encodedContent = encodeURIComponent(svgContent);
  return `${mimeType},${encodedContent}`;
}

/**
 * Extract SVG content from data URI for inline rendering (mobile-friendly)
 */
function extractSVGContent(dataURI: string): string | null {
  if (!dataURI.startsWith('data:image/svg+xml')) return null;
  
  try {
    if (dataURI.includes(';base64,')) {
      const base64Data = dataURI.split(',')[1];
      return atob(base64Data);
    } else {
      const parts = dataURI.split(',');
      if (parts.length < 2) return null;
      const encodedData = parts.slice(1).join(',');
      
      // Try to decode if URL-encoded
      if (/%[0-9A-Fa-f]{2}/.test(encodedData)) {
        return decodeURIComponent(encodedData);
      }
      return encodedData;
    }
  } catch (e) {
    console.error('Failed to extract SVG content:', e);
    return null;
  }
}

interface ContractsListProps {
  contracts: NFTContract[];
  onSelectContract: (contract: NFTContract) => void;
}

export default function ContractsList({ contracts, onSelectContract }: ContractsListProps): React.JSX.Element {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4">
          NFT Collections
        </h1>
        <p className="text-lg text-purple-700">
          Select a collection to view all minted NFTs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contracts.map((contract) => (
          <Card
            key={contract.address}
            className="cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105 bg-white/90 backdrop-blur-sm border-2 border-purple-200"
            onClick={() => onSelectContract(contract)}
          >
            <CardHeader>
              {contract.image && (
                <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  {contract.image.startsWith('data:image/svg+xml') ? (
                    (() => {
                      const svgContent = extractSVGContent(contract.image);
                      return svgContent ? (
                        <div 
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{ __html: svgContent }}
                        />
                      ) : (
                        <img
                          src={`https://via.placeholder.com/400x400?text=${encodeURIComponent(contract.symbol)}`}
                          alt={contract.name}
                          className="w-full h-full object-contain"
                        />
                      );
                    })()
                  ) : (
                    <img
                      src={contract.image}
                      alt={contract.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://via.placeholder.com/400x400?text=${encodeURIComponent(contract.symbol)}`;
                      }}
                    />
                  )}
                </div>
              )}
              <CardTitle className="text-2xl text-purple-900">{contract.name}</CardTitle>
              <CardDescription className="text-purple-600">
                {contract.symbol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contract.description && (
                <p className="text-gray-700 mb-4">{contract.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="font-mono text-xs truncate">
                  {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                </span>
                <span className="text-purple-600 font-semibold">View Collection →</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
