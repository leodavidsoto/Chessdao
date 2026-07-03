import { NextResponse } from 'next/server'
import { listGames, GameStatus } from '@/lib/gameStore'

// The lobby is live data; never prerender/cache it as a static route.
export const dynamic = 'force-dynamic'

/**
 * GET /api/game/active - Get all games waiting for players.
 *
 * Reads the shared store directly instead of self-fetching `/api/game`, which
 * previously depended on a base-URL env var that is often unset and broke in
 * serverless deployments.
 */
export async function GET() {
    try {
        const games = await listGames({ status: GameStatus.Waiting })
        return NextResponse.json({
            success: true,
            games,
            total: games.length,
        })
    } catch (error) {
        console.error('Error fetching active games:', error)
        return NextResponse.json({ success: true, games: [], total: 0 })
    }
}
