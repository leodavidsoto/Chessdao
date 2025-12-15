import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

/**
 * GET /api/user/search?q=username&limit=10
 * Search for users by username
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')
        const limit = parseInt(searchParams.get('limit') || '10')
        const excludeWallet = searchParams.get('exclude') // Exclude current user

        if (!query || query.length < 2) {
            return NextResponse.json(
                { error: 'Search query must be at least 2 characters' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Build search query
        const searchQuery = {
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { displayName: { $regex: query, $options: 'i' } }
            ],
            profileCompleted: true
        }

        if (excludeWallet) {
            searchQuery.walletAddress = { $ne: excludeWallet }
        }

        // Search users
        const users = await db.collection('users')
            .find(searchQuery)
            .limit(limit)
            .toArray()

        // Get friendship status if excludeWallet provided
        let friendshipMap = {}
        if (excludeWallet && users.length > 0) {
            const friendships = await db.collection('friendships').find({
                $or: [
                    { userId: excludeWallet, friendId: { $in: users.map(u => u.walletAddress) } },
                    { friendId: excludeWallet, userId: { $in: users.map(u => u.walletAddress) } }
                ]
            }).toArray()

            friendships.forEach(f => {
                const otherWallet = f.userId === excludeWallet ? f.friendId : f.userId
                friendshipMap[otherWallet] = {
                    status: f.status,
                    type: f.type,
                    friendshipId: f._id.toString()
                }
            })
        }

        await client.close()

        // Format results
        const results = users.map(user => ({
            walletAddress: user.walletAddress,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            rating: user.rating || 1200,
            gamesPlayed: user.gamesPlayed || 0,
            isOnline: user.isOnline || false,
            status: user.status || 'available',
            country: user.country,
            badges: user.badges?.slice(0, 3) || [],
            friendship: friendshipMap[user.walletAddress] || null
        }))

        return NextResponse.json({
            query,
            results,
            total: results.length
        })

    } catch (error) {
        console.error('Search API error:', error)
        return NextResponse.json(
            { error: 'Failed to search users', details: error.message },
            { status: 500 }
        )
    }
}
