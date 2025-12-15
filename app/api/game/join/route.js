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
 * POST /api/game/join - Join an existing game
 * Body: { walletAddress, gameId, username }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, gameId, username } = body

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
                { success: false, error: 'Game is not available to join' },
                { status: 400 }
            )
        }

        if (game.player1 === walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Cannot join your own game' },
                { status: 400 }
            )
        }

        // Update game
        game.player2 = walletAddress
        game.player2Username = username || `Player_${walletAddress.slice(0, 6)}`
        game.totalPot = game.betAmount * 2
        game.status = 'active'
        game.startedAt = Date.now()

        console.log(`🎮 ${game.player2Username} joined game ${gameId}. Total pot: ${game.totalPot} CHESS`)

        return NextResponse.json({
            success: true,
            game,
            totalPot: game.totalPot,
            signature: `join_game_${gameId}_${Date.now()}`
        })
    } catch (error) {
        console.error('Error joining game:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

