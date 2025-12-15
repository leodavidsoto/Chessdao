import { NextResponse } from 'next/server'

// In-memory player storage with persistence simulation
const getPlayersStorage = () => {
    if (!global.playersStorage) {
        global.playersStorage = {
            players: [
                {
                    walletAddress: '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo',
                    username: 'GrandMaster_Rex',
                    rating: 2400,
                    gamesPlayed: 150,
                    gamesWon: 98,
                    tokensEarned: 15000,
                    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
                    lastActive: Date.now()
                },
                {
                    walletAddress: 'ChessQueen99xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                    username: 'ChessQueen_99',
                    rating: 2250,
                    gamesPlayed: 120,
                    gamesWon: 72,
                    tokensEarned: 8500,
                    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
                    lastActive: Date.now() - 3600000
                },
                {
                    walletAddress: 'KnightRiderxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                    username: 'KnightRider',
                    rating: 2100,
                    gamesPlayed: 88,
                    gamesWon: 45,
                    tokensEarned: 5200,
                    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
                    lastActive: Date.now() - 7200000
                }
            ]
        }
    }
    return global.playersStorage
}

/**
 * GET /api/players - Get all players or search by wallet
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const wallet = searchParams.get('wallet')
        const limit = parseInt(searchParams.get('limit') || '50')

        const storage = getPlayersStorage()
        let players = [...storage.players]

        // Filter by wallet if provided
        if (wallet) {
            players = players.filter(p => p.walletAddress === wallet)
        }

        // Sort by rating
        players.sort((a, b) => b.rating - a.rating)

        // Apply limit
        players = players.slice(0, limit)

        return NextResponse.json({
            success: true,
            players,
            total: players.length
        })
    } catch (error) {
        console.error('Error fetching players:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/players - Create or update a player
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, username } = body

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Wallet address is required' },
                { status: 400 }
            )
        }

        const storage = getPlayersStorage()
        let player = storage.players.find(p => p.walletAddress === walletAddress)

        if (player) {
            // Update existing player
            if (username) player.username = username
            player.lastActive = Date.now()
        } else {
            // Create new player
            player = {
                walletAddress,
                username: username || `Player_${walletAddress.slice(0, 6)}`,
                rating: 1200,
                gamesPlayed: 0,
                gamesWon: 0,
                tokensEarned: 0,
                createdAt: Date.now(),
                lastActive: Date.now()
            }
            storage.players.push(player)
        }

        console.log(`👤 Player updated: ${player.username}`)

        return NextResponse.json({
            success: true,
            player
        })
    } catch (error) {
        console.error('Error creating/updating player:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/players - Update player stats after a game
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { walletAddress, gameResult, tokensChange, ratingChange } = body

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Wallet address is required' },
                { status: 400 }
            )
        }

        const storage = getPlayersStorage()
        let player = storage.players.find(p => p.walletAddress === walletAddress)

        if (!player) {
            // Create player if doesn't exist
            player = {
                walletAddress,
                username: `Player_${walletAddress.slice(0, 6)}`,
                rating: 1200,
                gamesPlayed: 0,
                gamesWon: 0,
                tokensEarned: 0,
                createdAt: Date.now(),
                lastActive: Date.now()
            }
            storage.players.push(player)
        }

        // Update stats based on game result
        player.gamesPlayed += 1
        if (gameResult === 'win') {
            player.gamesWon += 1
        }

        // Update tokens
        if (tokensChange) {
            player.tokensEarned = Math.max(0, (player.tokensEarned || 0) + tokensChange)
        }

        // Update rating
        if (ratingChange) {
            player.rating = Math.max(100, player.rating + ratingChange)
        }

        player.lastActive = Date.now()

        console.log(`📊 Player stats updated: ${player.username} - Rating: ${player.rating}`)

        return NextResponse.json({
            success: true,
            player
        })
    } catch (error) {
        console.error('Error updating player stats:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
