import { NextResponse } from 'next/server'

// In-memory NFT storage (shared with mint route in production use DB)
const nftStorage = new Map()

// GET - Get user's NFT inventory
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

        // In production, fetch from MongoDB or Metaplex
        const nfts = nftStorage.get(wallet) || []

        // Demo: Return some sample NFTs if empty
        const demoNfts = nfts.length > 0 ? nfts : []

        return NextResponse.json({
            success: true,
            wallet,
            nfts: demoNfts,
            total: demoNfts.length,
            stats: {
                characters: demoNfts.filter(n => n.type === 'character').length,
                skins: demoNfts.filter(n => n.type === 'skin').length,
                powerups: demoNfts.filter(n => n.type === 'powerup').length,
                items: demoNfts.filter(n => n.type === 'item').length
            }
        })

    } catch (error) {
        console.error('Error fetching NFT inventory:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
