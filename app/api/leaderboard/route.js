import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20')
        const type = searchParams.get('type') || 'rating' // rating, wins, tokens

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        let sortField = 'rating'
        if (type === 'wins') sortField = 'gamesWon'
        if (type === 'tokens') sortField = 'tokensEarned'

        const players = await db.collection('players')
            .find({})
            .sort({ [sortField]: -1 })
            .limit(limit)
            .toArray()

        await client.close()

        // Add rank to each player
        const leaderboard = players.map((player, index) => ({
            rank: index + 1,
            username: player.username,
            walletAddress: player.walletAddress,
            rating: player.rating,
            gamesPlayed: player.gamesPlayed,
            gamesWon: player.gamesWon,
            winRate: player.gamesPlayed > 0
                ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
                : 0,
            tokensEarned: player.tokensEarned
        }))

        return NextResponse.json({
            leaderboard,
            total: leaderboard.length,
            sortedBy: type
        })
    } catch (error) {
        console.error('Leaderboard error:', error)

        // Return demo data if MongoDB unavailable
        return NextResponse.json({
            leaderboard: [
                { rank: 1, username: 'GrandMaster_Rex', rating: 2400, gamesWon: 98, winRate: 65 },
                { rank: 2, username: 'ChessQueen_99', rating: 2250, gamesWon: 72, winRate: 60 },
                { rank: 3, username: 'KnightRider', rating: 2100, gamesWon: 45, winRate: 51 },
                { rank: 4, username: 'BishopBlitz', rating: 1950, gamesWon: 30, winRate: 45 },
                { rank: 5, username: 'RookMaster', rating: 1800, gamesWon: 18, winRate: 40 }
            ],
            demo: true,
            total: 5,
            sortedBy: 'rating'
        })
    }
}
