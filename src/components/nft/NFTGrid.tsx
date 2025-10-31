import React, { useState, useMemo, useEffect } from "react";
import { NFT, NFTContract, FilterOption, ActiveFilters } from "../../types/NFTTypes";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { ArrowLeft, Filter, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

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

interface NFTGridProps {
  contract: NFTContract;
  nfts: NFT[];
  onSelectNFT: (nft: NFT) => void;
  onBack: () => void;
  loading?: boolean;
  loadingProgress?: { current: number; total: number };
}

export default function NFTGrid({
  contract,
  nfts,
  onSelectNFT,
  onBack,
  loading = false,
  loadingProgress,
}: NFTGridProps): React.JSX.Element {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Extract all available filter options from NFT attributes
  const filterOptions = useMemo((): FilterOption[] => {
    const optionsMap = new Map<string, Set<string | number>>();

    nfts.forEach((nft) => {
      if (nft.metadata.attributes) {
        nft.metadata.attributes.forEach((attr) => {
          if (!optionsMap.has(attr.trait_type)) {
            optionsMap.set(attr.trait_type, new Set());
          }
          optionsMap.get(attr.trait_type)!.add(attr.value);
        });
      }
    });

    return Array.from(optionsMap.entries()).map(([trait_type, values]) => ({
      trait_type,
      values,
    }));
  }, [nfts]);

  // Filter NFTs based on active filters
  const filteredNFTs = useMemo(() => {
    if (Object.keys(activeFilters).length === 0) {
      return nfts;
    }

    return nfts.filter((nft) => {
      if (!nft.metadata.attributes) return false;

      // Check if NFT matches all active filters
      return Object.entries(activeFilters).every(([trait_type, values]) => {
        if (values.size === 0) return true;

        const nftAttribute = nft.metadata.attributes?.find(
          (attr) => attr.trait_type === trait_type
        );

        return nftAttribute && values.has(nftAttribute.value);
      });
    });
  }, [nfts, activeFilters]);

  const toggleFilter = (trait_type: string, value: string | number) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      
      if (!newFilters[trait_type]) {
        newFilters[trait_type] = new Set();
      }

      if (newFilters[trait_type].has(value)) {
        newFilters[trait_type].delete(value);
        if (newFilters[trait_type].size === 0) {
          delete newFilters[trait_type];
        }
      } else {
        newFilters[trait_type].add(value);
      }

      return newFilters;
    });
  };

  const clearFilters = () => {
    setActiveFilters({});
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).reduce(
      (count, values) => count + values.size,
      0
    );
  }, [activeFilters]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-4 border-purple-300 hover:bg-purple-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collections
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-purple-900 mb-2">
              {contract.name}
            </h1>
            <p className="text-purple-600">
              {filteredNFTs.length} {filteredNFTs.length === 1 ? "NFT" : "NFTs"}
              {activeFilterCount > 0 && ` (${nfts.length} total)`}
            </p>
          </div>

          <div className="flex gap-2">
            {activeFilterCount > 0 && (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="border-purple-300 hover:bg-purple-100"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters ({activeFilterCount})
              </Button>
            )}

            <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
                <DialogHeader>
                  <DialogTitle>Filter NFTs</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {filterOptions.map((option) => (
                    <div key={option.trait_type} className="space-y-3">
                      <h3 className="font-semibold text-purple-900 border-b pb-2">
                        {option.trait_type}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from(option.values)
                          .sort()
                          .map((value) => {
                            const isChecked =
                              activeFilters[option.trait_type]?.has(value) ??
                              false;
                            const id = `${option.trait_type}-${value}`;

                            return (
                              <div
                                key={value.toString()}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={id}
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    toggleFilter(option.trait_type, value)
                                  }
                                />
                                <Label
                                  htmlFor={id}
                                  className="cursor-pointer text-sm"
                                >
                                  {value.toString()}
                                </Label>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-purple-700 font-semibold text-lg mb-2">Loading NFTs...</p>
          {loadingProgress && loadingProgress.total > 0 && (
            <>
              <p className="text-purple-600">
                {loadingProgress.current} / {loadingProgress.total} NFTs processed
              </p>
              <div className="w-full max-w-md mx-auto mt-4 bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                  style={{
                    width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                  }}
                ></div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredNFTs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-purple-700">
            {activeFilterCount > 0
              ? "No NFTs match the selected filters"
              : "No NFTs found in this collection"}
          </p>
        </div>
      )}

      {/* NFT Grid */}
      {!loading && filteredNFTs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredNFTs.map((nft) => (
            <Card
              key={`${nft.contractAddress}-${nft.tokenId}`}
              className="cursor-pointer hover:shadow-xl transition-all transform hover:scale-105 bg-white/90 backdrop-blur-sm border-2 border-purple-200"
              onClick={() => onSelectNFT(nft)}
            >
              <CardHeader className="p-0">
                <div className="w-full aspect-square rounded-t-lg overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  {nft.metadata.image.startsWith('data:image/svg+xml') ? (
                    <object
                      data={ensureEncodedDataURI(nft.metadata.image)}
                      type="image/svg+xml"
                      className="w-full h-full"
                      aria-label={nft.metadata.name}
                    >
                      <img
                        src={`https://via.placeholder.com/400x400?text=NFT+${nft.tokenId}`}
                        alt={nft.metadata.name}
                        className="w-full h-full object-contain"
                      />
                    </object>
                  ) : (
                    <img
                      src={nft.metadata.image}
                      alt={nft.metadata.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.log('Image load error for:', nft.metadata.name);
                        const target = e.target as HTMLImageElement;
                        target.src = `https://via.placeholder.com/400x400?text=NFT+${nft.tokenId}`;
                      }}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg text-purple-900 truncate">
                  {nft.metadata.name || `#${nft.tokenId}`}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">#{nft.tokenId}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
