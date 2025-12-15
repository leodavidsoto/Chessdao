import { NextResponse } from 'next/server'

// This will be imported from a shared module in production
// For now, we reference the games array from the parent route
// In production, use MongoDB

/**
 * GET /api/game/active - Get all games waiting for players
 */
export async function GET() {
    try {
        // In production, fetch from MongoDB
        // For now, return mock data with proper structure

        const activeGames = [
            // This would come from the database
        ]

        // Fetch from the main games endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/game?status=waiting`)

        if (!response.ok) {
            throw new Error('Failed to fetch active games')
        }

        const data = await response.json()

        return NextResponse.json({
            success: true,
            games: data.games || [],
            total: data.total || 0
        })
    } catch (error) {
        console.error('Error fetching active games:', error)

        // Return empty array on error
        return NextResponse.json({
            success: true,
            games: [],
            total: 0
        })
    }
}
