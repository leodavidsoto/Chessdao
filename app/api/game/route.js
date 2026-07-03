import { NextResponse } from 'next/server'
import { createGame, listGames, countByStatus, GameStatus } from '@/lib/gameStore'
import { requireWalletAuth } from '@/lib/auth'

/**
 * GET /api/game - List games, optionally filtered by status and/or player.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const walletAddress = searchParams.get('wallet')

        const games = await listGames({ status, wallet: walletAddress })
        const [activeGames, waitingGames] = await Promise.all([
            countByStatus(GameStatus.Active),
            countByStatus(GameStatus.Waiting),
        ])

        return NextResponse.json({
            success: true,
            games,
            total: games.length,
            activeGames,
            waitingGames,
        })
    } catch (error) {
        console.error('Error fetching games:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch games' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/game - Create a new game.
 * Body: { walletAddress, betAmount, timeControl, gameTitle, username }
 * Auth: wallet signature for `walletAddress` (START_GAME_BET action).
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, betAmount, timeControl, gameTitle, username } = body

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Wallet address is required' },
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

        const amount = Number(betAmount)
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Bet amount must be a positive number' },
                { status: 400 }
            )
        }

        const game = await createGame({
            player1: walletAddress,
            player1Username: username,
            betAmount: amount,
            timeControl,
            title: gameTitle,
        })

        console.log(`🎮 Game ${game.gameId} created by ${username || walletAddress.slice(0, 8)} with ${amount} CHESS bet`)

        return NextResponse.json({
            success: true,
            gameId: game.gameId,
            game,
            signature: `create_game_${game.gameId}_${Date.now()}`,
        })
    } catch (error) {
        console.error('Error creating game:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create game' },
            { status: 500 }
        )
    }
}
