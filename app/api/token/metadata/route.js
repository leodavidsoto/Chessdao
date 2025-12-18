import { NextResponse } from 'next/server'

/**
 * CHESS Token Metadata - TEP-64 Standard (Jetton Metadata)
 * 
 * This endpoint is queried by TON wallets and explorers to display
 * token information including name, symbol, decimals, and logo.
 * 
 * Standard: https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
 */
export async function GET() {
    const metadata = {
        // Token name displayed in wallets
        name: "ChessDAO Token",

        // Short symbol (like "ETH" or "TON")
        symbol: "CHESS",

        // Number of decimal places (9 is standard for TON)
        decimals: 9,

        // Description shown in token details
        description: "CHESS is the governance and utility token for ChessDAO - Play, earn, and compete in chess on TON blockchain. Use CHESS tokens to bet on games, unlock features, and participate in DAO governance.",

        // Token logo - uses the deployed logo
        image: "https://chessdao-production.up.railway.app/logo.png",

        // Additional metadata
        image_data: undefined, // Use image URL instead of base64

        // Social links (optional, shown in some explorers)
        social_links: [
            "https://t.me/ChessDAObot",
            "https://chessdao-production.up.railway.app"
        ]
    }

    return NextResponse.json(metadata, {
        headers: {
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'Access-Control-Allow-Origin': '*',
        }
    })
}
