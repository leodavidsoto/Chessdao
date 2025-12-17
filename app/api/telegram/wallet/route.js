import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

// In-memory fallback for when MongoDB is not available
const telegramWallets = new Map()

/**
 * GET /api/telegram/wallet?telegramId=xxx
 * Get linked wallet for Telegram user
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const telegramId = searchParams.get('telegramId')

        if (!telegramId) {
            return NextResponse.json(
                { error: 'telegramId is required' },
                { status: 400 }
            )
        }

        // Try MongoDB first
        try {
            const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
            await client.connect()
            const db = client.db(DB_NAME)

            const record = await db.collection('telegram_wallets').findOne({ telegramId })
            await client.close()

            if (record) {
                return NextResponse.json({
                    success: true,
                    wallet: record.walletAddress,
                    linkedAt: record.linkedAt
                })
            }
        } catch (dbError) {
            console.log('MongoDB unavailable, using in-memory storage')
            // Check in-memory fallback
            if (telegramWallets.has(telegramId)) {
                return NextResponse.json({
                    success: true,
                    wallet: telegramWallets.get(telegramId).wallet,
                    demo: true
                })
            }
        }

        return NextResponse.json({
            success: false,
            wallet: null
        })

    } catch (error) {
        console.error('Telegram wallet lookup error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/telegram/wallet
 * Link a Solana wallet to a Telegram user
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { telegramId, telegramUsername, walletAddress } = body

        if (!telegramId || !walletAddress) {
            return NextResponse.json(
                { error: 'telegramId and walletAddress are required' },
                { status: 400 }
            )
        }

        // Validate wallet address format (basic check)
        if (walletAddress.length < 32 || walletAddress.length > 44) {
            return NextResponse.json(
                { error: 'Invalid wallet address format' },
                { status: 400 }
            )
        }

        const now = new Date()

        // Try MongoDB first
        try {
            const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
            await client.connect()
            const db = client.db(DB_NAME)

            // Upsert the wallet link
            await db.collection('telegram_wallets').updateOne(
                { telegramId },
                {
                    $set: {
                        telegramId,
                        telegramUsername,
                        walletAddress,
                        updatedAt: now
                    },
                    $setOnInsert: {
                        linkedAt: now
                    }
                },
                { upsert: true }
            )

            // Also update/create user profile with telegram info
            await db.collection('users').updateOne(
                { walletAddress },
                {
                    $set: {
                        telegramId,
                        telegramUsername,
                        'profile.telegramLinked': true,
                        updatedAt: now
                    }
                },
                { upsert: true }
            )

            await client.close()

            console.log(`🔗 Linked Telegram ${telegramId} (@${telegramUsername}) to wallet ${walletAddress}`)

            return NextResponse.json({
                success: true,
                message: 'Wallet linked successfully',
                telegramId,
                walletAddress
            })

        } catch (dbError) {
            console.log('MongoDB unavailable, using in-memory storage')

            // Fallback to in-memory
            telegramWallets.set(telegramId, {
                wallet: walletAddress,
                username: telegramUsername,
                linkedAt: now
            })

            return NextResponse.json({
                success: true,
                message: 'Wallet linked (demo mode)',
                demo: true,
                telegramId,
                walletAddress
            })
        }

    } catch (error) {
        console.error('Telegram wallet link error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/telegram/wallet
 * Unlink wallet from Telegram user
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const telegramId = searchParams.get('telegramId')

        if (!telegramId) {
            return NextResponse.json(
                { error: 'telegramId is required' },
                { status: 400 }
            )
        }

        try {
            const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
            await client.connect()
            const db = client.db(DB_NAME)

            await db.collection('telegram_wallets').deleteOne({ telegramId })
            await client.close()
        } catch (dbError) {
            telegramWallets.delete(telegramId)
        }

        return NextResponse.json({
            success: true,
            message: 'Wallet unlinked'
        })

    } catch (error) {
        console.error('Telegram wallet unlink error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
