import { NextResponse } from 'next/server'

// In-memory NFT storage (use MongoDB in production)
const nftStorage = new Map()

// NFT Collection metadata
const NFT_COLLECTION = {
    name: 'ChessDAO NFTs',
    symbol: 'CHESSNFT',
    description: 'Collectible NFT characters and items for ChessDAO',
    image: 'https://chessdao.io/collection.png',
    external_url: 'https://chessdao.io'
}

// NFT items by rarity
const NFT_ITEMS = {
    common: [
        { id: 'c1', name: 'Peón Guerrero', type: 'character', image: '♟️', attributes: { power: 10, rarity: 'common' } },
        { id: 'c2', name: 'Caballo de Bronce', type: 'character', image: '♞', attributes: { power: 15, rarity: 'common' } },
        { id: 'c3', name: 'Alfil Místico', type: 'character', image: '♝', attributes: { power: 12, rarity: 'common' } },
        { id: 'c4', name: 'Ficha de Tiempo +30s', type: 'powerup', image: '⏱️', attributes: { effect: '+30s', rarity: 'common' } },
        { id: 'c5', name: 'Escudo Básico', type: 'item', image: '🛡️', attributes: { defense: 5, rarity: 'common' } }
    ],
    rare: [
        { id: 'r1', name: 'Torre de Piedra', type: 'character', image: '♜', attributes: { power: 25, rarity: 'rare' } },
        { id: 'r2', name: 'Caballo de Plata', type: 'character', image: '🐴', attributes: { power: 30, rarity: 'rare' } },
        { id: 'r3', name: 'Skin Clásico', type: 'skin', image: '🎨', attributes: { theme: 'classic', rarity: 'rare' } },
        { id: 'r4', name: 'Boost 1.5x EXP', type: 'powerup', image: '⚡', attributes: { multiplier: 1.5, rarity: 'rare' } }
    ],
    epic: [
        { id: 'e1', name: 'Reina de Cristal', type: 'character', image: '👑', attributes: { power: 50, rarity: 'epic' } },
        { id: 'e2', name: 'Rey Dorado', type: 'character', image: '♚', attributes: { power: 45, rarity: 'epic' } },
        { id: 'e3', name: 'Caballo de Obsidiana', type: 'character', image: '🌑', attributes: { power: 55, rarity: 'epic' } },
        { id: 'e4', name: 'Tablero Neón', type: 'skin', image: '🌈', attributes: { theme: 'neon', rarity: 'epic' } },
        { id: 'e5', name: 'Boost 2x EXP', type: 'powerup', image: '🚀', attributes: { multiplier: 2, rarity: 'epic' } }
    ],
    legendary: [
        { id: 'l1', name: 'Magnus el Inmortal', type: 'character', image: '🧙‍♂️', attributes: { power: 100, rarity: 'legendary' } },
        { id: 'l2', name: 'La Dama Oscura', type: 'character', image: '🖤', attributes: { power: 95, rarity: 'legendary' } },
        { id: 'l3', name: 'Tablero Dimensional', type: 'skin', image: '🌌', attributes: { theme: 'dimensional', rarity: 'legendary' } },
        { id: 'l4', name: 'Avatar Holográfico', type: 'avatar', image: '👤', attributes: { special: true, rarity: 'legendary' } },
        { id: 'l5', name: 'Corona del Campeón', type: 'item', image: '👑', attributes: { prestige: true, rarity: 'legendary' } }
    ]
}

// Generate unique NFT ID
function generateNFTId() {
    return `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate mock transaction signature
function generateTxSignature() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 88; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// POST - Mint new NFT
export async function POST(request) {
    try {
        const body = await request.json()
        const { wallet, boxType, price, item } = body

        if (!wallet || !item) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: wallet, item'
            }, { status: 400 })
        }

        console.log(`🎁 Minting NFT for wallet: ${wallet.slice(0, 8)}...`)
        console.log(`   Box Type: ${boxType}, Price: ${price} CHESS`)
        console.log(`   Item: ${item.name} (${item.rarity})`)

        // Create NFT metadata
        const nftId = generateNFTId()
        const txSignature = generateTxSignature()

        const nftMetadata = {
            id: nftId,
            name: item.name,
            symbol: 'CHESSNFT',
            description: `${item.name} - ChessDAO NFT Collection`,
            image: item.image,
            type: item.type,
            rarity: item.rarity,
            attributes: item.attributes || {},
            owner: wallet,
            mintedAt: new Date().toISOString(),
            transactionId: txSignature,
            boxType,
            collection: NFT_COLLECTION.name
        }

        // Store NFT
        if (!nftStorage.has(wallet)) {
            nftStorage.set(wallet, [])
        }
        nftStorage.get(wallet).push(nftMetadata)

        console.log(`✅ NFT minted successfully: ${nftId}`)
        console.log(`   Transaction: ${txSignature.slice(0, 20)}...`)

        return NextResponse.json({
            success: true,
            nft: nftMetadata,
            transactionId: txSignature,
            message: `¡Has obtenido ${item.name}!`
        })

    } catch (error) {
        console.error('❌ Error minting NFT:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}

// GET - Get NFT inventory
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const wallet = searchParams.get('wallet')

        if (!wallet) {
            return NextResponse.json({
                success: false,
                error: 'Missing wallet parameter'
            }, { status: 400 })
        }

        const nfts = nftStorage.get(wallet) || []

        return NextResponse.json({
            success: true,
            wallet,
            nfts,
            total: nfts.length,
            stats: {
                common: nfts.filter(n => n.rarity === 'common').length,
                rare: nfts.filter(n => n.rarity === 'rare').length,
                epic: nfts.filter(n => n.rarity === 'epic').length,
                legendary: nfts.filter(n => n.rarity === 'legendary').length
            }
        })

    } catch (error) {
        console.error('Error fetching inventory:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
