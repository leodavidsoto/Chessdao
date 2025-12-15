import { NextResponse } from 'next/server'

// Shared game storage
const getGamesStorage = () => {
    if (!global.gamesStorage) {
        global.gamesStorage = {
            games: [],
            gameIdCounter: 1
        }
    }
    return global.gamesStorage
}

/**
 * POST /api/game/cancel - Cancel a game that hasn't started
 * Body: { walletAddress, gameId }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, gameId } = body

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Wallet address is required' },
                { status: 400 }
            )
        }

        if (!gameId) {
            return NextResponse.json(
                { success: false, error: 'Game ID is required' },
                { status: 400 }
            )
        }

        const storage = getGamesStorage()
        const game = storage.games.find(g => g.gameId === parseInt(gameId))

        if (!game) {
            return NextResponse.json(
                { success: false, error: 'Game not found' },
                { status: 404 }
            )
        }

        if (game.status !== 'waiting') {
            return NextResponse.json(
                { success: false, error: 'Can only cancel games waiting for players' },
                { status: 400 }
            )
        }

        if (game.player1 !== walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Only the game creator can cancel' },
                { status: 403 }
            )
        }

        // Cancel and refund
        game.status = 'cancelled'
        game.endedAt = Date.now()

        console.log(`❌ Game ${gameId} cancelled. Refunding ${game.betAmount} CHESS to ${walletAddress}`)

        return NextResponse.json({
            success: true,
            game,
            refundAmount: game.betAmount,
            signature: `cancel_game_${gameId}_${Date.now()}`
        })
    } catch (error) {
        console.error('Error cancelling game:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
