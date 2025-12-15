import { NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

/**
 * GET /api/user/friends?wallet=xxx
 * Get friends list and pending requests
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')
        const type = searchParams.get('type') || 'all' // all, friends, followers, following, pending

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        let friendships = []
        let pendingRequests = []

        // Get accepted friends (bidirectional)
        if (type === 'all' || type === 'friends') {
            friendships = await db.collection('friendships').find({
                $or: [
                    { userId: walletAddress, type: 'friend', status: 'accepted' },
                    { friendId: walletAddress, type: 'friend', status: 'accepted' }
                ]
            }).toArray()
        }

        // Get followers (people following this user)
        let followers = []
        if (type === 'all' || type === 'followers') {
            followers = await db.collection('friendships').find({
                friendId: walletAddress,
                type: 'follow',
                status: 'accepted'
            }).toArray()
        }

        // Get following (people this user follows)
        let following = []
        if (type === 'all' || type === 'following') {
            following = await db.collection('friendships').find({
                userId: walletAddress,
                type: 'follow',
                status: 'accepted'
            }).toArray()
        }

        // Get pending incoming requests
        if (type === 'all' || type === 'pending') {
            pendingRequests = await db.collection('friendships').find({
                friendId: walletAddress,
                status: 'pending'
            }).toArray()
        }

        // Get sent pending requests
        const sentRequests = await db.collection('friendships').find({
            userId: walletAddress,
            status: 'pending'
        }).toArray()

        // Get friend wallet addresses
        const friendWallets = new Set()
        friendships.forEach(f => {
            friendWallets.add(f.userId === walletAddress ? f.friendId : f.userId)
        })
        followers.forEach(f => friendWallets.add(f.userId))
        following.forEach(f => friendWallets.add(f.friendId))
        pendingRequests.forEach(f => friendWallets.add(f.userId))
        sentRequests.forEach(f => friendWallets.add(f.friendId))

        // Get user profiles for all friends
        const userProfiles = await db.collection('users').find({
            walletAddress: { $in: Array.from(friendWallets) }
        }).toArray()

        const profileMap = {}
        userProfiles.forEach(u => {
            profileMap[u.walletAddress] = {
                walletAddress: u.walletAddress,
                username: u.username,
                displayName: u.displayName,
                avatar: u.avatar,
                rating: u.rating || 1200,
                isOnline: u.isOnline || false,
                lastSeen: u.lastSeen,
                status: u.status || 'available'
            }
        })

        // Build response with profile data
        const buildFriendData = (friendship, isIncoming = false) => {
            const friendWallet = isIncoming
                ? friendship.userId
                : (friendship.userId === walletAddress ? friendship.friendId : friendship.userId)

            return {
                friendshipId: friendship._id.toString(),
                ...profileMap[friendWallet] || { walletAddress: friendWallet, username: 'Unknown' },
                friendshipType: friendship.type,
                friendshipStatus: friendship.status,
                since: friendship.acceptedAt || friendship.createdAt
            }
        }

        await client.close()

        return NextResponse.json({
            walletAddress,
            friends: friendships.map(f => buildFriendData(f)),
            followers: followers.map(f => buildFriendData(f, true)),
            following: following.map(f => buildFriendData(f)),
            pendingIncoming: pendingRequests.map(f => buildFriendData(f, true)),
            pendingSent: sentRequests.map(f => buildFriendData(f)),
            counts: {
                friends: friendships.length,
                followers: followers.length,
                following: following.length,
                pendingIncoming: pendingRequests.length,
                pendingSent: sentRequests.length
            }
        })

    } catch (error) {
        console.error('Friends API error:', error)
        return NextResponse.json(
            { error: 'Failed to get friends', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/user/friends
 * Send friend request or follow
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { userId, friendId, type = 'friend', note = '' } = body

        if (!userId || !friendId) {
            return NextResponse.json(
                { error: 'userId and friendId are required' },
                { status: 400 }
            )
        }

        if (userId === friendId) {
            return NextResponse.json(
                { error: 'Cannot add yourself as a friend' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Check if target user exists
        const targetUser = await db.collection('users').findOne({ walletAddress: friendId })

        if (!targetUser) {
            await client.close()
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Check if target allows friend requests
        if (type === 'friend' && targetUser.settings?.allowFriendRequests === false) {
            await client.close()
            return NextResponse.json(
                { error: 'This user does not accept friend requests' },
                { status: 403 }
            )
        }

        // Check if friendship already exists
        const existingFriendship = await db.collection('friendships').findOne({
            $or: [
                { userId, friendId },
                { userId: friendId, friendId: userId }
            ]
        })

        if (existingFriendship) {
            await client.close()

            if (existingFriendship.status === 'blocked') {
                return NextResponse.json(
                    { error: 'Cannot send request to this user' },
                    { status: 403 }
                )
            }

            return NextResponse.json(
                { error: 'Friendship already exists', status: existingFriendship.status },
                { status: 409 }
            )
        }

        const now = new Date()

        // For follow type, auto-accept
        const status = type === 'follow' ? 'accepted' : 'pending'

        const friendship = {
            userId,
            friendId,
            type,
            status,
            initiatedBy: userId,
            note,
            createdAt: now,
            acceptedAt: status === 'accepted' ? now : null
        }

        await db.collection('friendships').insertOne(friendship)

        // Create notification for target user
        const senderProfile = await db.collection('users').findOne({ walletAddress: userId })

        await db.collection('notifications').insertOne({
            userId: friendId,
            type: type === 'friend' ? 'friend_request' : 'new_follower',
            title: type === 'friend' ? 'Nueva solicitud de amistad' : 'Nuevo seguidor',
            message: type === 'friend'
                ? `${senderProfile?.username || 'Alguien'} quiere ser tu amigo`
                : `${senderProfile?.username || 'Alguien'} te ha seguido`,
            data: {
                fromWallet: userId,
                fromUsername: senderProfile?.username,
                friendshipType: type
            },
            fromUser: userId,
            read: false,
            dismissed: false,
            actionUrl: '/dashboard/friends',
            createdAt: now
        })

        await client.close()

        return NextResponse.json({
            success: true,
            message: type === 'friend' ? 'Friend request sent' : 'Now following',
            friendship: {
                type,
                status,
                targetUser: {
                    walletAddress: friendId,
                    username: targetUser.username
                }
            }
        })

    } catch (error) {
        console.error('Add friend error:', error)
        return NextResponse.json(
            { error: 'Failed to send request', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/user/friends
 * Accept or decline friend request
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { friendshipId, walletAddress, action } = body // action: 'accept' | 'decline' | 'block'

        if (!friendshipId || !walletAddress || !action) {
            return NextResponse.json(
                { error: 'friendshipId, walletAddress, and action are required' },
                { status: 400 }
            )
        }

        if (!['accept', 'decline', 'block'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use: accept, decline, or block' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Find the friendship
        const friendship = await db.collection('friendships').findOne({
            _id: new ObjectId(friendshipId)
        })

        if (!friendship) {
            await client.close()
            return NextResponse.json(
                { error: 'Friendship not found' },
                { status: 404 }
            )
        }

        // Verify the user is the recipient
        if (friendship.friendId !== walletAddress) {
            await client.close()
            return NextResponse.json(
                { error: 'Not authorized to modify this friendship' },
                { status: 403 }
            )
        }

        const now = new Date()
        let newStatus

        switch (action) {
            case 'accept':
                newStatus = 'accepted'
                await db.collection('friendships').updateOne(
                    { _id: new ObjectId(friendshipId) },
                    { $set: { status: 'accepted', acceptedAt: now } }
                )

                // Notify sender
                await db.collection('notifications').insertOne({
                    userId: friendship.userId,
                    type: 'friend_accepted',
                    title: 'Solicitud aceptada',
                    message: 'Tu solicitud de amistad fue aceptada',
                    data: { friendWallet: walletAddress },
                    fromUser: walletAddress,
                    read: false,
                    dismissed: false,
                    createdAt: now
                })
                break

            case 'decline':
                await db.collection('friendships').deleteOne({
                    _id: new ObjectId(friendshipId)
                })
                newStatus = 'declined'
                break

            case 'block':
                await db.collection('friendships').updateOne(
                    { _id: new ObjectId(friendshipId) },
                    { $set: { status: 'blocked', blockedAt: now } }
                )
                newStatus = 'blocked'
                break
        }

        await client.close()

        return NextResponse.json({
            success: true,
            action,
            newStatus
        })

    } catch (error) {
        console.error('Update friendship error:', error)
        return NextResponse.json(
            { error: 'Failed to update friendship', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/user/friends
 * Remove friend or unfollow
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const friendshipId = searchParams.get('friendshipId')
        const walletAddress = searchParams.get('wallet')

        if (!friendshipId || !walletAddress) {
            return NextResponse.json(
                { error: 'friendshipId and wallet are required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Find and verify ownership
        const friendship = await db.collection('friendships').findOne({
            _id: new ObjectId(friendshipId)
        })

        if (!friendship) {
            await client.close()
            return NextResponse.json(
                { error: 'Friendship not found' },
                { status: 404 }
            )
        }

        // Verify user is part of this friendship
        if (friendship.userId !== walletAddress && friendship.friendId !== walletAddress) {
            await client.close()
            return NextResponse.json(
                { error: 'Not authorized to remove this friendship' },
                { status: 403 }
            )
        }

        await db.collection('friendships').deleteOne({
            _id: new ObjectId(friendshipId)
        })

        await client.close()

        return NextResponse.json({
            success: true,
            message: 'Friendship removed'
        })

    } catch (error) {
        console.error('Remove friend error:', error)
        return NextResponse.json(
            { error: 'Failed to remove friend', details: error.message },
            { status: 500 }
        )
    }
}
