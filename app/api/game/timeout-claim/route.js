import { NextResponse } from 'next/server'
import { getGame, transition, GameStatus } from '@/lib/gameStore'
import { requireWalletAuth } from '@/lib/auth'

const DAO_FEE_PERCENTAGE = 0.025
const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

/**
 * POST /api/game/timeout-claim - Claim a stalled game after the timeout window.
 * Body: { walletAddress, gameId }
 * Auth: wallet signature for `walletAddress` (CLAIM_TIMEOUT action).
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

        if (game.status !== GameStatus.Active) {
            return NextResponse.json(
                { success: false, error: 'Game is not active' },
                { status: 400 }
            )
        }

        // Only a participant may claim.
        if (walletAddress !== game.player1 && walletAddress !== game.player2) {
            return NextResponse.json(
                { success: false, error: 'You are not a player in this game' },
                { status: 403 }
            )
        }

        const timeSinceStart = Date.now() - game.startedAt
        if (timeSinceStart < TIMEOUT_MS) {
            const minutesRemaining = Math.ceil((TIMEOUT_MS - timeSinceStart) / 60000)
            return NextResponse.json(
                { success: false, error: `Timeout not reached. ${minutesRemaining} minutes remaining.` },
                { status: 400 }
            )
        }

        const daoFee = Math.floor(game.totalPot * DAO_FEE_PERCENTAGE)
        const prizePool = game.totalPot - daoFee

        const result = await transition(gameId, GameStatus.Active, {
            status: GameStatus.Timeout,
            winner: walletAddress,
            endedAt: Date.now(),
        })

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.reason === 'not_found' ? 'Game not found' : 'Game already resolved',
                },
                { status: result.reason === 'not_found' ? 404 : 409 }
            )
        }

        console.log(`⏰ Game ${gameId} claimed by timeout. Winner: ${walletAddress}, Prize: ${prizePool} CHESS`)

        return NextResponse.json({
            success: true,
            game: result.game,
            prizeAmount: prizePool,
            daoFee,
            winner: walletAddress,
            signature: `timeout_claim_${gameId}_${Date.now()}`,
        })
    } catch (error) {
        console.error('Error claiming timeout:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to claim timeout' },
            { status: 500 }
        )
    }
}
