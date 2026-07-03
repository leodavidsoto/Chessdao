import { NextResponse } from 'next/server'
import { getGame, transition, GameStatus } from '@/lib/gameStore'
import { requireWalletAuth } from '@/lib/auth'

/**
 * POST /api/game/cancel - Cancel a game that has not started, refunding player1.
 * Body: { walletAddress, gameId }
 * Auth: wallet signature for `walletAddress` (CANCEL_GAME action).
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

        const auth = requireWalletAuth(request, { expectedWallet: walletAddress })
        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
            )
        }

        const game = await getGame(gameId)
        if (!game) {
            return NextResponse.json(
                { success: false, error: 'Game not found' },
                { status: 404 }
            )
        }

        if (game.status !== GameStatus.Waiting) {
            return NextResponse.json(
                { success: false, error: 'Can only cancel games waiting for players' },
                { status: 400 }
            )
        }

        // Only the creator may cancel. Verified against the signed wallet, not
        // just the request body.
        if (game.player1 !== walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Only the game creator can cancel' },
                { status: 403 }
            )
        }

        const result = await transition(gameId, GameStatus.Waiting, {
            status: GameStatus.Cancelled,
            endedAt: Date.now(),
        })

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.reason === 'not_found' ? 'Game not found' : 'Game can no longer be cancelled',
                },
                { status: result.reason === 'not_found' ? 404 : 409 }
            )
        }

        console.log(`❌ Game ${gameId} cancelled. Refunding ${result.game.betAmount} CHESS to ${walletAddress}`)

        return NextResponse.json({
            success: true,
            game: result.game,
            refundAmount: result.game.betAmount,
            signature: `cancel_game_${gameId}_${Date.now()}`,
        })
    } catch (error) {
        console.error('Error cancelling game:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to cancel game' },
            { status: 500 }
        )
    }
}
