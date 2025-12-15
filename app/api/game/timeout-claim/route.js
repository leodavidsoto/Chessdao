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

const DAO_FEE_PERCENTAGE = 0.025
const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

/**
 * POST /api/game/timeout-claim - Claim funds from a timed out game
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

        if (game.status !== 'active') {
            return NextResponse.json(
                { success: false, error: 'Game is not active' },
                { status: 400 }
            )
        }

        // Verify claimer is a player
        if (walletAddress !== game.player1 && walletAddress !== game.player2) {
            return NextResponse.json(
                { success: false, error: 'You are not a player in this game' },
                { status: 403 }
            )
        }

        // Check if timeout has been reached (30 minutes since game started)
        const timeSinceStart = Date.now() - game.startedAt
        if (timeSinceStart < TIMEOUT_MS) {
            const minutesRemaining = Math.ceil((TIMEOUT_MS - timeSinceStart) / 60000)
            return NextResponse.json(
                { success: false, error: `Timeout not reached. ${minutesRemaining} minutes remaining.` },
                { status: 400 }
            )
        }

        // Calculate prizes
        const daoFee = Math.floor(game.totalPot * DAO_FEE_PERCENTAGE)
        const prizePool = game.totalPot - daoFee

        // Award to claimer
        game.status = 'timeout'
        game.winner = walletAddress
        game.endedAt = Date.now()

        console.log(`⏰ Game ${gameId} claimed by timeout. Winner: ${walletAddress}, Prize: ${prizePool} CHESS`)

        return NextResponse.json({
            success: true,
            game,
            prizeAmount: prizePool,
            daoFee,
            winner: walletAddress,
            signature: `timeout_claim_${gameId}_${Date.now()}`
        })
    } catch (error) {
        console.error('Error claiming timeout:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
