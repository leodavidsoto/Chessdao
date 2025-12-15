'use client'

import {
    Connection,
    PublicKey,
    Transaction
} from '@solana/web3.js'

// Solana connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

// ChessDAO NFT Collection
const NFT_COLLECTION = {
    name: 'ChessDAO NFTs',
    symbol: 'CHESSNFT',
    description: 'Collectible NFT characters and items for ChessDAO',
    creators: [
        {
            address: '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo',
            share: 100
        }
    ],
    sellerFeeBasisPoints: 500, // 5% royalty
    collection: null // Will be set after collection is created
}

/**
 * Create NFT metadata for Metaplex
 * In production, this would interact with the Metaplex SDK
 */
export async function createNFTMetadata(item) {
    const metadata = {
        name: item.name,
        symbol: 'CHESSNFT',
        description: `${item.name} - A ${item.rarity} ${item.type} from ChessDAO NFT Collection`,
        seller_fee_basis_points: 500,
        image: `https://chessdao.io/nfts/${item.id}.png`,
        animation_url: null,
        external_url: 'https://chessdao.io',
        attributes: [
            { trait_type: 'Type', value: item.type },
            { trait_type: 'Rarity', value: item.rarity },
            { trait_type: 'Power', value: item.attributes?.power || 0 },
            { trait_type: 'Collection', value: 'ChessDAO Genesis' }
        ],
        properties: {
            files: [
                {
                    uri: `https://chessdao.io/nfts/${item.id}.png`,
                    type: 'image/png'
                }
            ],
            category: 'image',
            creators: NFT_COLLECTION.creators
        }
    }

    return metadata
}

/**
 * Mint NFT using Metaplex (Demo/Simulation)
 * In production, integrate with @metaplex-foundation/js
 */
export async function mintNFT(wallet, item, rarity) {
    try {
        console.log(`🎨 Preparing NFT mint for: ${item.name}`)

        // Create metadata
        const metadata = await createNFTMetadata({ ...item, rarity })

        // In production, this would:
        // 1. Upload metadata to Arweave/IPFS
        // 2. Create NFT using Metaplex
        // 3. Return the mint address and transaction signature

        // Demo response
        const mintAddress = `nft${Date.now()}${Math.random().toString(36).substr(2, 9)}`
        const txSignature = generateMockSignature()

        console.log(`✅ NFT prepared: ${mintAddress}`)

        return {
            success: true,
            mint: mintAddress,
            metadata,
            signature: txSignature,
            owner: wallet
        }

    } catch (error) {
        console.error('❌ Error minting NFT:', error)
        throw error
    }
}

/**
 * Transfer NFT to another wallet
 */
export async function transferNFT(fromWallet, toWallet, nftMint) {
    try {
        console.log(`📦 Preparing NFT transfer...`)
        console.log(`   From: ${fromWallet.slice(0, 8)}...`)
        console.log(`   To: ${toWallet.slice(0, 8)}...`)
        console.log(`   NFT: ${nftMint}`)

        // In production, use Metaplex transfer
        const txSignature = generateMockSignature()

        return {
            success: true,
            signature: txSignature,
            from: fromWallet,
            to: toWallet,
            nft: nftMint
        }

    } catch (error) {
        console.error('❌ Error transferring NFT:', error)
        throw error
    }
}

/**
 * Get all NFTs owned by a wallet
 */
export async function getNFTsByOwner(walletAddress) {
    try {
        console.log(`🔍 Fetching NFTs for: ${walletAddress.slice(0, 8)}...`)

        // In production, query Metaplex or Helius API
        // For demo, return empty array (items stored in our API)

        return {
            success: true,
            nfts: [],
            total: 0
        }

    } catch (error) {
        console.error('❌ Error fetching NFTs:', error)
        return {
            success: false,
            nfts: [],
            error: error.message
        }
    }
}

/**
 * Verify NFT ownership
 */
export async function verifyNFTOwnership(walletAddress, nftMint) {
    try {
        // In production, verify on-chain
        return {
            success: true,
            isOwner: true, // Demo always true
            wallet: walletAddress,
            nft: nftMint
        }
    } catch (error) {
        console.error('Error verifying ownership:', error)
        return {
            success: false,
            isOwner: false,
            error: error.message
        }
    }
}

/**
 * Get NFT metadata by mint address
 */
export async function getNFTMetadata(nftMint) {
    try {
        // In production, fetch from Metaplex/Arweave
        return {
            success: true,
            metadata: {
                name: 'ChessDAO NFT',
                symbol: 'CHESSNFT',
                description: 'A collectible from ChessDAO',
                image: `https://chessdao.io/nfts/${nftMint}.png`
            }
        }
    } catch (error) {
        console.error('Error fetching metadata:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Calculate loot box drop - determines rarity
 */
export function calculateDrop(boxType) {
    const dropRates = {
        normal: { common: 0.60, rare: 0.30, epic: 0.09, legendary: 0.01 },
        epic: { common: 0.20, rare: 0.45, epic: 0.30, legendary: 0.05 },
        legendary: { common: 0, rare: 0.10, epic: 0.70, legendary: 0.20 }
    }

    const rates = dropRates[boxType] || dropRates.normal
    const rand = Math.random()
    let cumulative = 0

    for (const [rarity, rate] of Object.entries(rates)) {
        cumulative += rate
        if (rand <= cumulative) {
            return rarity
        }
    }

    return 'common'
}

/**
 * Generate mock Solana signature for demo
 */
function generateMockSignature() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 88; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * NFT Rarity colors for UI
 */
export const RARITY_COLORS = {
    common: '#718096',
    rare: '#4299e1',
    epic: '#9f7aea',
    legendary: '#f6ad55'
}

/**
 * NFT Rarity labels
 */
export const RARITY_LABELS = {
    common: 'Común',
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Legendario'
}
