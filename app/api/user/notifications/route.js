import { NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

/**
 * GET /api/user/notifications?wallet=xxx
 * Get notifications for a user
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')
        const unreadOnly = searchParams.get('unread') === 'true'
        const limit = parseInt(searchParams.get('limit') || '50')

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Build query
        const query = {
            userId: walletAddress,
            dismissed: { $ne: true }
        }

        if (unreadOnly) {
            query.read = false
        }

        // Get notifications
        const notifications = await db.collection('notifications')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray()

        // Get unread count
        const unreadCount = await db.collection('notifications').countDocuments({
            userId: walletAddress,
            read: false,
            dismissed: { $ne: true }
        })

        // Get sender profiles
        const senderWallets = [...new Set(notifications.filter(n => n.fromUser).map(n => n.fromUser))]

        let senderMap = {}
        if (senderWallets.length > 0) {
            const senders = await db.collection('users').find({
                walletAddress: { $in: senderWallets }
            }).toArray()

            senders.forEach(s => {
                senderMap[s.walletAddress] = {
                    username: s.username,
                    avatar: s.avatar
                }
            })
        }

        await client.close()

        // Format notifications
        const formattedNotifications = notifications.map(n => ({
            id: n._id.toString(),
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data,
            read: n.read,
            actionUrl: n.actionUrl,
            fromUser: n.fromUser ? {
                walletAddress: n.fromUser,
                ...senderMap[n.fromUser]
            } : null,
            createdAt: n.createdAt,
            readAt: n.readAt
        }))

        return NextResponse.json({
            walletAddress,
            notifications: formattedNotifications,
            unreadCount,
            total: notifications.length
        })

    } catch (error) {
        console.error('Notifications API error:', error)
        return NextResponse.json(
            { error: 'Failed to get notifications', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/user/notifications
 * Mark notifications as read or dismissed
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { walletAddress, notificationId, action, markAllRead } = body

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'walletAddress is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const now = new Date()

        if (markAllRead) {
            // Mark all unread as read
            const result = await db.collection('notifications').updateMany(
                { userId: walletAddress, read: false },
                { $set: { read: true, readAt: now } }
            )

            await client.close()

            return NextResponse.json({
                success: true,
                action: 'mark_all_read',
                updated: result.modifiedCount
            })
        }

        if (!notificationId) {
            await client.close()
            return NextResponse.json(
                { error: 'notificationId is required' },
                { status: 400 }
            )
        }

        // Find notification and verify ownership
        const notification = await db.collection('notifications').findOne({
            _id: new ObjectId(notificationId)
        })

        if (!notification) {
            await client.close()
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            )
        }

        if (notification.userId !== walletAddress) {
            await client.close()
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            )
        }

        // Update based on action
        const updateData = {}

        switch (action) {
            case 'read':
                updateData.read = true
                updateData.readAt = now
                break
            case 'dismiss':
                updateData.dismissed = true
                break
            case 'unread':
                updateData.read = false
                updateData.readAt = null
                break
            default:
                await client.close()
                return NextResponse.json(
                    { error: 'Invalid action. Use: read, unread, or dismiss' },
                    { status: 400 }
                )
        }

        await db.collection('notifications').updateOne(
            { _id: new ObjectId(notificationId) },
            { $set: updateData }
        )

        await client.close()

        return NextResponse.json({
            success: true,
            action,
            notificationId
        })

    } catch (error) {
        console.error('Update notification error:', error)
        return NextResponse.json(
            { error: 'Failed to update notification', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/user/notifications
 * Create a new notification (internal use)
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { userId, type, title, message, data, fromUser, actionUrl } = body

        if (!userId || !type || !title) {
            return NextResponse.json(
                { error: 'userId, type, and title are required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const notification = {
            userId,
            type,
            title,
            message: message || '',
            data: data || {},
            fromUser: fromUser || null,
            actionUrl: actionUrl || null,
            read: false,
            dismissed: false,
            createdAt: new Date()
        }

        const result = await db.collection('notifications').insertOne(notification)

        await client.close()

        return NextResponse.json({
            success: true,
            notificationId: result.insertedId.toString()
        })

    } catch (error) {
        console.error('Create notification error:', error)
        return NextResponse.json(
            { error: 'Failed to create notification', details: error.message },
            { status: 500 }
        )
    }
}
