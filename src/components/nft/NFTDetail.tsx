import React from "react";
import { NFT } from "../../types/NFTTypes";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Separator } from "../ui/separator";

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

interface NFTDetailProps {
  nft: NFT;
  contractName: string;
  onBack: () => void;
}

export default function NFTDetail({
  nft,
  contractName,
  onBack,
}: NFTDetailProps): React.JSX.Element {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <Button
        onClick={onBack}
        variant="outline"
        className="mb-6 border-purple-300 hover:bg-purple-100"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Collection
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-purple-200">
            <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-4">
              {nft.metadata.image.startsWith('data:image/svg+xml') ? (
                (() => {
                  const svgContent = extractSVGContent(nft.metadata.image);
                  return svgContent ? (
                    <div 
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  ) : (
                    <img
                      src={`https://via.placeholder.com/800x800?text=NFT+${nft.tokenId}`}
                      alt={nft.metadata.name}
                      className="w-full h-full object-contain"
                    />
                  );
                })()
              ) : (
                <img
                  src={nft.metadata.image}
                  alt={nft.metadata.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://via.placeholder.com/800x800?text=NFT+${nft.tokenId}`;
                  }}
                />
              )}
            </div>
          </Card>

          {nft.metadata.animation_url && (
            <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="text-xl text-purple-900">
                  Animation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <video
                  src={nft.metadata.animation_url}
                  controls
                  className="w-full rounded-lg"
                >
                  Your browser does not support the video tag.
                </video>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          {/* Title and Description */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-semibold mb-1">
                    {contractName}
                  </p>
                  <CardTitle className="text-3xl text-purple-900">
                    {nft.metadata.name || `#${nft.tokenId}`}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {nft.metadata.description && (
                <p className="text-gray-700 mb-4">{nft.metadata.description}</p>
              )}
              
              <Separator className="my-4" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Token ID</span>
                  <span className="font-semibold text-purple-900">
                    #{nft.tokenId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract Address</span>
                  <span className="font-mono text-xs text-purple-900">
                    {nft.contractAddress.slice(0, 6)}...
                    {nft.contractAddress.slice(-4)}
                  </span>
                </div>
                {nft.owner && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner</span>
                    <span className="font-mono text-xs text-purple-900">
                      {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              {nft.metadata.external_url && (
                <a
                  href={nft.metadata.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-purple-600 hover:text-purple-800 font-semibold"
                >
                  View on External Site
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              )}
            </CardContent>
          </Card>

          {/* Attributes */}
          {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="text-2xl text-purple-900">
                  Attributes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {nft.metadata.attributes.map((attr, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200"
                    >
                      <p className="text-xs text-purple-600 uppercase font-semibold mb-1">
                        {attr.trait_type}
                      </p>
                      <p className="text-sm font-bold text-purple-900 truncate">
                        {attr.value.toString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata JSON */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-xl text-purple-900">
                Raw Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                {JSON.stringify(nft.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
