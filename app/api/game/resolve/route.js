import { NextResponse } from 'next/server'
import { getGame, transition, GameStatus } from '@/lib/gameStore'
import { requireOracle } from '@/lib/auth'

const DAO_FEE_PERCENTAGE = 0.025

/**
 * POST /api/game/resolve - Resolve a completed game and settle the pot.
 * Body: { gameId, winnerAddress, isDraw }
 *
 * SECURITY: the outcome of a chess game is determined by the game engine /
 * socket server, NOT by whoever calls this endpoint. Previously any client
 * could POST here and name themselves the winner, draining both players' bets.
 * Resolution is now restricted to the trusted backend via the oracle guard
 * (`x-oracle-key`). The status guard in `transition` also makes resolution
 * idempotent: a game can only move out of `active` once.
 */
export async function POST(request) {
    try {
        const auth = requireOracle(request)
        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
            )
        }

        const body = await request.json()
        const { gameId, winnerAddress, isDraw } = body

        if (!gameId) {
            return NextResponse.json(
                { success: false, error: 'Game ID is required' },
                { status: 400 }
            )
        }

        const game = await getGame(gameId)
        if (!game) {
            return NextResponse.json(
                { success: false, error: 'Game not found' },
                { status: 404 }
            )
        }

        if (game.status !== GameStatus.Active) {
            return NextResponse.json(
                { success: false, error: 'Game is not active' },
                { status: 400 }
            )
        }

        const daoFee = Math.floor(game.totalPot * DAO_FEE_PERCENTAGE)
        const prizePool = game.totalPot - daoFee
        const endedAt = Date.now()

        if (isDraw) {
            const result = await transition(gameId, GameStatus.Active, {
                status: GameStatus.Draw,
                winner: null,
                endedAt,
            })
            if (!result.ok) {
                return NextResponse.json(
                    { success: false, error: result.reason === 'not_found' ? 'Game not found' : 'Game already resolved' },
                    { status: result.reason === 'not_found' ? 404 : 409 }
                )
            }

            const halfPrize = Math.floor(prizePool / 2)
            console.log(`🤝 Game ${gameId} ended in a draw. Each player receives ${halfPrize} CHESS`)

            return NextResponse.json({
                success: true,
                game: result.game,
                prizeAmount: halfPrize,
                daoFee,
                isDraw: true,
                signature: `resolve_draw_${gameId}_${endedAt}`,
            })
        }

        // Winner path: the winner MUST be one of the two players in this game.
        if (!winnerAddress || (winnerAddress !== game.player1 && winnerAddress !== game.player2)) {
            return NextResponse.json(
                { success: false, error: 'Invalid winner address' },
                { status: 400 }
            )
        }

        const result = await transition(gameId, GameStatus.Active, {
            status: GameStatus.Completed,
            winner: winnerAddress,
            endedAt,
        })
        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.reason === 'not_found' ? 'Game not found' : 'Game already resolved' },
                { status: result.reason === 'not_found' ? 404 : 409 }
            )
        }

        console.log(`🏆 Game ${gameId} won by ${winnerAddress}. Prize: ${prizePool} CHESS, DAO Fee: ${daoFee} CHESS`)

        return NextResponse.json({
            success: true,
            game: result.game,
            prizeAmount: prizePool,
            daoFee,
            winner: winnerAddress,
            signature: `resolve_win_${gameId}_${endedAt}`,
        })
    } catch (error) {
        console.error('Error resolving game:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to resolve game' },
            { status: 500 }
        )
    }
}
