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

/**
 * POST /api/game/resolve - Resolve a completed game
 * Body: { gameId, winnerAddress, isDraw }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { gameId, winnerAddress, isDraw } = body

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

        // Calculate fees and prizes
        const daoFee = Math.floor(game.totalPot * DAO_FEE_PERCENTAGE)
        const prizePool = game.totalPot - daoFee

        if (isDraw) {
            // Draw: each player gets half the prize pool
            game.status = 'draw'
            game.winner = null

            const halfPrize = Math.floor(prizePool / 2)

            console.log(`🤝 Game ${gameId} ended in a draw. Each player receives ${halfPrize} CHESS`)

            return NextResponse.json({
                success: true,
                game,
                prizeAmount: halfPrize,
                daoFee,
                isDraw: true,
                signature: `resolve_draw_${gameId}_${Date.now()}`
            })
        } else {
            // Validate winner
            if (!winnerAddress || (winnerAddress !== game.player1 && winnerAddress !== game.player2)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid winner address' },
                    { status: 400 }
                )
            }

            game.status = 'completed'
            game.winner = winnerAddress
            game.endedAt = Date.now()

            console.log(`🏆 Game ${gameId} won by ${winnerAddress}. Prize: ${prizePool} CHESS, DAO Fee: ${daoFee} CHESS`)

            return NextResponse.json({
                success: true,
                game,
                prizeAmount: prizePool,
                daoFee,
                winner: winnerAddress,
                signature: `resolve_win_${gameId}_${Date.now()}`
            })
        }
    } catch (error) {
        console.error('Error resolving game:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
