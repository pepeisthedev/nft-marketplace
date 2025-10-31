import React, { useState, useEffect } from "react";
import { useAppKitAccount, useAppKitProvider, useAppKit, useAppKitNetwork } from "@reown/appkit/react";
import { hardhat, baseSepolia, base } from '@reown/appkit/networks';
import { BrowserProvider } from "ethers";
import { Wallet, Network } from "lucide-react";
import { NFTContract, NFT } from "../types/NFTTypes";
import { NFT_CONTRACTS_BY_NETWORK } from "../config/contracts";
import { getNFTsFromContract, getNFTById, getContractInfo } from "../services/nftService";
import ContractsList from "./nft/ContractsList";
import NFTGrid from "./nft/NFTGrid";
import NFTDetail from "./nft/NFTDetail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type ViewType = "contracts" | "nfts" | "detail";

export default function MainPage(): React.JSX.Element {
    const { isConnected } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider("eip155");
    const { caipNetwork, switchNetwork } = useAppKitNetwork();
    const { open } = useAppKit();

    const [currentView, setCurrentView] = useState<ViewType>("contracts");
    const [selectedContract, setSelectedContract] = useState<NFTContract | null>(null);
    const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
    const [contractsWithImages, setContractsWithImages] = useState<NFTContract[]>([]);

    // Get chain ID from CAIP network (format: "eip155:84532" -> 84532)
    // Default to Base Sepolia (84532) if not available


    // Get contracts for current network


    const chainId = React.useMemo(() => {
        if (!caipNetwork?.id) return 84532; // default Base Sepolia
        const parts = String(caipNetwork.id).split(":");
        const parsed = parseInt(parts[1]);
        return isNaN(parsed) ? 84532 : parsed;
        }, [caipNetwork]);

        const currentNetworkContracts = NFT_CONTRACTS_BY_NETWORK[chainId] || [];


    // Network options with their details
    const networkMap: Record<number, any> = {
        31337: hardhat,
        84532: baseSepolia,
        8453: base,
    };

    const networks = [
        { id: 31337, name: "Hardhat" },
        { id: 84532, name: "Base Sepolia" },
        { id: 8453, name: "Base" },
    ];

    const handleNetworkChange = async (networkId: string) => {
        try {
            const id = parseInt(networkId);
            const network = networkMap[id];
            if (network) {
                await switchNetwork(network);
            }
        } catch (error) {
            console.error("Failed to switch network:", error);
        }
    };

    useEffect(() => {
    if (isConnected && walletProvider && currentNetworkContracts.length > 0) {
        fetchContractImages();
    } else {
        setContractsWithImages(currentNetworkContracts);
    }
    }, [isConnected, walletProvider, chainId]);


    const fetchContractImages = async () => {
        if (!walletProvider) return;

        try {
            const ethersProvider = new BrowserProvider(walletProvider as any);
            const contractsWithImagesPromises = currentNetworkContracts.map(async (contract) => {
                try {
                    // Fetch contract info (name, symbol, totalSupply) and token 0
                    const [contractInfo, token0] = await Promise.all([
                        getContractInfo(contract.address, ethersProvider),
                        getNFTById(contract.address, "0", ethersProvider),
                    ]);
                    //console.log(`Fetched images for ${contract.address}:`, token0.metadata.image);

                    return {
                        ...contract,
                        name: contractInfo.name,
                        symbol: contractInfo.symbol,
                        image: token0.metadata.image,
                    };
                } catch (err) {
                    console.warn(`Could not fetch info for ${contract.address}:`, err);
                    // Return contract with defaults if fetch fails
                    return contract;
                }
            });

            const updatedContracts = await Promise.all(contractsWithImagesPromises);
            setContractsWithImages(updatedContracts);
        } catch (err) {
            console.error("Error fetching contract images:", err);
            // Keep using default contracts if there's an error
        }
    };

    const handleWalletClick = () => {
        if (!isConnected) {
            // Open wallet connection modal
            open();
        } else {
            // If connected, open account modal to show details/disconnect
            open({ view: "Account" });
        }
    };

    const handleSelectContract = async (contract: NFTContract) => {
        if (!walletProvider) {
            setError("Wallet not connected");
            return;
        }

        setSelectedContract(contract);
        setCurrentView("nfts");
        setLoading(true);
        setError(null);
        setLoadingProgress({ current: 0, total: 0 });

        try {
            const ethersProvider = new BrowserProvider(walletProvider as any);
            const nftList = await getNFTsFromContract(
                contract.address, 
                ethersProvider,
                (current, total) => {
                    setLoadingProgress({ current, total });
                }
            );
            setNfts(nftList);
        } catch (err) {
            console.error("Error loading NFTs:", err);
            setError(
                err instanceof Error ? err.message : "Failed to load NFTs from contract"
            );
        } finally {
            setLoading(false);
            setLoadingProgress({ current: 0, total: 0 });
        }
    };

    const handleSelectNFT = (nft: NFT) => {
        setSelectedNFT(nft);
        setCurrentView("detail");
    };

    const handleBackToContracts = () => {
        setCurrentView("contracts");
        setSelectedContract(null);
        setNfts([]);
        setError(null);
    };

    const handleBackToNFTs = () => {
        setCurrentView("nfts");
        setSelectedNFT(null);
    };

    // Reset view when wallet disconnects
    useEffect(() => {
        if (!isConnected) {
            setCurrentView("contracts");
            setSelectedContract(null);
            setSelectedNFT(null);
            setNfts([]);
            setError(null);
        }
    }, [isConnected]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-400 p-4 md:p-8 relative overflow-hidden">
            {/* Header */}
            <div className="w-full max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-purple-900">
                        NFT Metadata Viewer
                    </h1>
                    <div className="flex items-center gap-3">
                        {isConnected && (
                            <Select value={chainId.toString()} onValueChange={handleNetworkChange}>
                                <SelectTrigger className="w-[180px] bg-white border-2 border-purple-300 hover:border-purple-400">
                                    <Network className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {networks.map((network) => (
                                        <SelectItem key={network.id} value={network.id.toString()}>
                                            {network.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <button
                            onClick={handleWalletClick}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg transition-all font-bold border-2 border-black transform hover:scale-105 flex items-center gap-2"
                        >
                            <Wallet className="w-5 h-5" />
                            {isConnected ? "Wallet" : "Connect Wallet"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {!isConnected ? (
                <div className="text-center py-12">
                    <p className="text-3xl md:text-4xl text-purple-700 mb-8 font-bold">
                        CONNECT YOUR WALLET TO START!
                    </p>
                    <button
                        onClick={handleWalletClick}
                        className="px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-2xl transition-all text-4xl font-bold border-4 border-black transform hover:scale-105 flex items-center justify-center mx-auto gap-3 cursor-pointer"
                    >
                        <Wallet className="w-10 h-10" />
                        CONNECT WALLET
                    </button>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 max-w-7xl mx-auto">
                            <strong className="font-bold">Error: </strong>
                            <span>{error}</span>
                        </div>
                    )}

                    {currentView === "contracts" && (
                        <ContractsList
                            contracts={contractsWithImages}
                            onSelectContract={handleSelectContract}
                        />
                    )}

                    {currentView === "nfts" && selectedContract && (
                        <NFTGrid
                            contract={selectedContract}
                            nfts={nfts}
                            onSelectNFT={handleSelectNFT}
                            onBack={handleBackToContracts}
                            loading={loading}
                            loadingProgress={loadingProgress}
                        />
                    )}

                    {currentView === "detail" && selectedNFT && selectedContract && (
                        <NFTDetail
                            nft={selectedNFT}
                            contractName={selectedContract.name}
                            onBack={handleBackToNFTs}
                        />
                    )}
                </>
            )}
        </div>
    );
}