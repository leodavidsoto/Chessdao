import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Stars to CHESS conversion rates
const STARS_PACKAGES = {
    100: { chess: 200, bonus: 0 },      // 100 Stars = 200 CHESS
    250: { chess: 550, bonus: 50 },     // 250 Stars = 500 + 50 bonus
    500: { chess: 1200, bonus: 200 },   // 500 Stars = 1000 + 200 bonus
    1000: { chess: 2500, bonus: 500 },  // 1000 Stars = 2000 + 500 bonus
}

/**
 * GET /api/payments/stars
 * Get available Stars packages
 */
export async function GET() {
    return NextResponse.json({
        currency: 'XTR', // Telegram Stars currency code
        packages: Object.entries(STARS_PACKAGES).map(([stars, pkg]) => ({
            stars: parseInt(stars),
            chess: pkg.chess,
            bonus: pkg.bonus,
            total: pkg.chess,
            label: `${pkg.chess} CHESS${pkg.bonus ? ` (+${pkg.bonus} bonus)` : ''}`
        })),
        info: {
            name: 'Telegram Stars',
            description: 'Purchase CHESS tokens using Telegram Stars',
            revenue_share: '70% to developer, 30% to Telegram'
        }
    })
}

/**
 * POST /api/payments/stars
 * Process Stars payment (called after successful invoice)
 * Body: { walletAddress, starsAmount, telegramUserId, invoicePayload }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, starsAmount, telegramUserId, invoicePayload } = body

        if (!walletAddress || !starsAmount) {
            return NextResponse.json(
                { error: 'walletAddress and starsAmount required' },
                { status: 400 }
            )
        }

        const stars = parseInt(starsAmount)
        const package_ = STARS_PACKAGES[stars]

        if (!package_) {
            return NextResponse.json(
                { error: 'Invalid Stars amount' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const now = new Date()

        // Record the purchase
        const purchase = await db.collection('stars_purchases').insertOne({
            walletAddress,
            telegramUserId,
            starsAmount: stars,
            chessAmount: package_.chess,
            bonus: package_.bonus,
            invoicePayload,
            status: 'completed',
            createdAt: now
        })

        // Credit CHESS to user (in-game balance for now)
        // In production, this would mint/transfer actual Jettons
        await db.collection('game_balances').updateOne(
            { walletAddress },
            {
                $inc: {
                    chessBalance: package_.chess,
                    totalPurchased: package_.chess
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        )

        // Create notification
        await db.collection('notifications').insertOne({
            userId: walletAddress,
            type: 'purchase',
            title: '⭐ Stars Purchase Complete!',
            message: `You received ${package_.chess} CHESS tokens${package_.bonus ? ` (includes ${package_.bonus} bonus!)` : ''}`,
            data: {
                stars,
                chess: package_.chess,
                bonus: package_.bonus,
                purchaseId: purchase.insertedId
            },
            read: false,
            dismissed: false,
            createdAt: now
        })

        await client.close()

        return NextResponse.json({
            success: true,
            purchase: {
                id: purchase.insertedId,
                starsSpent: stars,
                chessReceived: package_.chess,
                bonus: package_.bonus
            },
            message: `Successfully purchased ${package_.chess} CHESS!`
        })

    } catch (error) {
        console.error('Stars payment error:', error)
        return NextResponse.json(
            { error: 'Payment processing failed', details: error.message },
            { status: 500 }
        )
    }
}
