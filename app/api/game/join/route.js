import { NextResponse } from 'next/server'
import { getGame, transition, GameStatus } from '@/lib/gameStore'
import { requireWalletAuth } from '@/lib/auth'

/**
 * POST /api/game/join - Join an existing waiting game.
 * Body: { walletAddress, gameId, username }
 * Auth: wallet signature for `walletAddress` (JOIN_GAME action).
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

        // Atomic: only succeeds if the game is still `waiting`, so two players
        // racing to join the same game cannot both win the seat.
        const result = await transition(gameId, GameStatus.Waiting, {
            player2: walletAddress,
            player2Username: username || `Player_${walletAddress.slice(0, 6)}`,
            totalPot: game.betAmount * 2,
            status: GameStatus.Active,
            startedAt: Date.now(),
        })

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.reason === 'not_found' ? 'Game not found' : 'Game was just filled or is no longer available',
                },
                { status: result.reason === 'not_found' ? 404 : 409 }
            )
        }

        console.log(`🎮 ${result.game.player2Username} joined game ${gameId}. Total pot: ${result.game.totalPot} CHESS`)

        return NextResponse.json({
            success: true,
            game: result.game,
            totalPot: result.game.totalPot,
            signature: `join_game_${gameId}_${Date.now()}`,
        })
    } catch (error) {
        console.error('Error joining game:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to join game' },
            { status: 500 }
        )
    }
}
