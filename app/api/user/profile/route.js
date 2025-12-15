import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Default avatar emojis
const DEFAULT_AVATARS = ['♟️', '♞', '♝', '♜', '♛', '♚', '🏰', '⚔️', '👑', '🎮']

/**
 * GET /api/user/profile?wallet=xxx
 * Get user profile by wallet address
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Get user profile
        const user = await db.collection('users').findOne({ walletAddress })

        if (!user) {
            // Return default profile for new users
            await client.close()
            return NextResponse.json({
                walletAddress,
                isNewUser: true,
                profile: {
                    username: null,
                    displayName: null,
                    avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
                    bio: '',
                    country: null,
                    profileCompleted: false
                },
                stats: {
                    rating: 1200,
                    gamesPlayed: 0,
                    gamesWon: 0,
                    winRate: 0
                },
                social: {
                    friendsCount: 0,
                    followersCount: 0,
                    followingCount: 0
                },
                settings: {
                    acceptChallenges: true,
                    showOnlineStatus: true,
                    allowFriendRequests: true
                }
            })
        }

        // Get friend counts
        const friendsCount = await db.collection('friendships').countDocuments({
            $or: [
                { userId: walletAddress, status: 'accepted' },
                { friendId: walletAddress, status: 'accepted' }
            ]
        })

        const followersCount = await db.collection('friendships').countDocuments({
            friendId: walletAddress,
            type: 'follow',
            status: 'accepted'
        })

        const followingCount = await db.collection('friendships').countDocuments({
            userId: walletAddress,
            type: 'follow',
            status: 'accepted'
        })

        await client.close()

        return NextResponse.json({
            walletAddress,
            isNewUser: false,
            profile: {
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                country: user.country,
                profileCompleted: user.profileCompleted || false,
                badges: user.badges || [],
                titles: user.titles || []
            },
            stats: {
                rating: user.rating || 1200,
                gamesPlayed: user.gamesPlayed || 0,
                gamesWon: user.gamesWon || 0,
                winRate: user.gamesPlayed > 0
                    ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
                    : 0
            },
            social: {
                friendsCount,
                followersCount,
                followingCount
            },
            settings: user.settings || {
                acceptChallenges: true,
                showOnlineStatus: true,
                allowFriendRequests: true
            },
            status: {
                isOnline: user.isOnline || false,
                lastSeen: user.lastSeen,
                currentStatus: user.status || 'available'
            },
            createdAt: user.createdAt
        })

    } catch (error) {
        console.error('Profile API error:', error)
        return NextResponse.json(
            { error: 'Failed to get profile', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/user/profile
 * Create new user profile
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, username, displayName, avatar, bio, country } = body

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'walletAddress is required' },
                { status: 400 }
            )
        }

        if (!username) {
            return NextResponse.json(
                { error: 'username is required' },
                { status: 400 }
            )
        }

        // Validate username
        if (username.length < 3 || username.length > 20) {
            return NextResponse.json(
                { error: 'Username must be 3-20 characters' },
                { status: 400 }
            )
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return NextResponse.json(
                { error: 'Username can only contain letters, numbers, and underscores' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Check if username already exists
        const existingUsername = await db.collection('users').findOne({
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        })

        if (existingUsername && existingUsername.walletAddress !== walletAddress) {
            await client.close()
            return NextResponse.json(
                { error: 'Username already taken' },
                { status: 409 }
            )
        }

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ walletAddress })

        const now = new Date()
        const userData = {
            walletAddress,
            username,
            displayName: displayName || username,
            avatar: avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
            bio: bio || '',
            country: country || null,
            rating: 1200,
            gamesPlayed: 0,
            gamesWon: 0,
            isOnline: true,
            lastSeen: now,
            status: 'available',
            settings: {
                acceptChallenges: true,
                showOnlineStatus: true,
                allowFriendRequests: true,
                notificationPrefs: {
                    challenges: true,
                    friendRequests: true,
                    gameResults: true
                }
            },
            badges: [],
            titles: [],
            profileCompleted: true,
            updatedAt: now
        }

        if (existingUser) {
            // Update existing user
            await db.collection('users').updateOne(
                { walletAddress },
                { $set: userData }
            )
        } else {
            // Create new user
            userData.createdAt = now
            await db.collection('users').insertOne(userData)

            // Give welcome bonus of $GAME tokens
            await db.collection('game_balances').updateOne(
                { walletAddress },
                {
                    $setOnInsert: {
                        walletAddress,
                        gameBalance: 500,
                        totalEarned: 500,
                        totalSpent: 0,
                        totalSwappedIn: 0,
                        totalSwappedOut: 0,
                        createdAt: now
                    },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            )

            // Create welcome notification
            await db.collection('notifications').insertOne({
                userId: walletAddress,
                type: 'system',
                title: '¡Bienvenido a ChessDAO!',
                message: 'Tu perfil ha sido creado. Recibes 500 $GAME de bienvenida.',
                data: { bonus: 500 },
                read: false,
                dismissed: false,
                createdAt: now
            })
        }

        await client.close()

        return NextResponse.json({
            success: true,
            message: existingUser ? 'Profile updated' : 'Profile created',
            profile: {
                walletAddress,
                username,
                displayName: userData.displayName,
                avatar: userData.avatar,
                profileCompleted: true
            }
        })

    } catch (error) {
        console.error('Create profile error:', error)
        return NextResponse.json(
            { error: 'Failed to create profile', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/user/profile
 * Update user profile
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { walletAddress, ...updates } = body

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'walletAddress is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Check if user exists
        const user = await db.collection('users').findOne({ walletAddress })

        if (!user) {
            await client.close()
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Validate username if being updated
        if (updates.username) {
            if (updates.username.length < 3 || updates.username.length > 20) {
                await client.close()
                return NextResponse.json(
                    { error: 'Username must be 3-20 characters' },
                    { status: 400 }
                )
            }

            const existingUsername = await db.collection('users').findOne({
                username: { $regex: new RegExp(`^${updates.username}$`, 'i') },
                walletAddress: { $ne: walletAddress }
            })

            if (existingUsername) {
                await client.close()
                return NextResponse.json(
                    { error: 'Username already taken' },
                    { status: 409 }
                )
            }
        }

        // Validate bio length
        if (updates.bio && updates.bio.length > 160) {
            await client.close()
            return NextResponse.json(
                { error: 'Bio must be 160 characters or less' },
                { status: 400 }
            )
        }

        // Build update object
        const allowedFields = ['username', 'displayName', 'avatar', 'bio', 'country', 'settings', 'status']
        const updateData = { updatedAt: new Date() }

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field]
            }
        }

        await db.collection('users').updateOne(
            { walletAddress },
            { $set: updateData }
        )

        await client.close()

        return NextResponse.json({
            success: true,
            message: 'Profile updated',
            updated: Object.keys(updateData).filter(k => k !== 'updatedAt')
        })

    } catch (error) {
        console.error('Update profile error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile', details: error.message },
            { status: 500 }
        )
    }
}
