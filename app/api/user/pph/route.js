import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// PPH (Profit Per Hour) configuration by level
const PPH_CONFIG = {
    bronze: { pph: 10, maxAccumulation: 30, nextLevel: 'silver', upgradeCost: 1000 },
    silver: { pph: 25, maxAccumulation: 75, nextLevel: 'gold', upgradeCost: 5000 },
    gold: { pph: 50, maxAccumulation: 150, nextLevel: 'platinum', upgradeCost: 20000 },
    platinum: { pph: 100, maxAccumulation: 300, nextLevel: 'diamond', upgradeCost: 50000 },
    diamond: { pph: 200, maxAccumulation: 600, nextLevel: 'master', upgradeCost: 100000 },
    master: { pph: 500, maxAccumulation: 1500, nextLevel: null, upgradeCost: null }
}

const MAX_ACCUMULATION_HOURS = 3

/**
 * Calculate accumulated passive income
 */
function calculateAccumulatedPPH(lastClaimTime, level = 'bronze') {
    const config = PPH_CONFIG[level] || PPH_CONFIG.bronze
    const now = Date.now()
    const lastClaim = new Date(lastClaimTime).getTime()

    // Hours since last claim (max 3 hours)
    const hoursSinceLastClaim = Math.min(
        (now - lastClaim) / (1000 * 60 * 60),
        MAX_ACCUMULATION_HOURS
    )

    // Calculate earnings (capped at max accumulation)
    const earned = Math.floor(hoursSinceLastClaim * config.pph)
    return Math.min(earned, config.maxAccumulation)
}

/**
 * GET /api/user/pph?wallet=xxx
 * Get passive income status
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')

        if (!walletAddress) {
            return NextResponse.json({ error: 'wallet required' }, { status: 400 })
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const user = await db.collection('users').findOne({ walletAddress })

        if (!user) {
            await client.close()
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const level = user.pphLevel || 'bronze'
        const config = PPH_CONFIG[level]
        const lastClaim = user.lastPphClaim || user.createdAt || new Date()

        const accumulated = calculateAccumulatedPPH(lastClaim, level)
        const hoursSinceLastClaim = Math.min(
            (Date.now() - new Date(lastClaim).getTime()) / (1000 * 60 * 60),
            MAX_ACCUMULATION_HOURS
        )

        await client.close()

        return NextResponse.json({
            level,
            pph: config.pph,
            maxAccumulation: config.maxAccumulation,
            accumulated,
            canClaim: accumulated > 0,
            lastClaim,
            hoursSinceLastClaim: Math.round(hoursSinceLastClaim * 100) / 100,
            nextLevel: config.nextLevel,
            upgradeCost: config.upgradeCost,
            allLevels: Object.entries(PPH_CONFIG).map(([lvl, cfg]) => ({
                level: lvl,
                pph: cfg.pph,
                maxAccumulation: cfg.maxAccumulation,
                upgradeCost: cfg.upgradeCost,
                isCurrent: lvl === level
            }))
        })

    } catch (error) {
        console.error('PPH GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/user/pph
 * Claim accumulated passive income
 * Body: { walletAddress }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress } = body

        if (!walletAddress) {
            return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const user = await db.collection('users').findOne({ walletAddress })

        if (!user) {
            await client.close()
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const level = user.pphLevel || 'bronze'
        const lastClaim = user.lastPphClaim || user.createdAt || new Date()
        const accumulated = calculateAccumulatedPPH(lastClaim, level)

        if (accumulated <= 0) {
            await client.close()
            return NextResponse.json({
                error: 'Nothing to claim yet',
                accumulated: 0
            }, { status: 400 })
        }

        const now = new Date()

        // Update user's last claim time
        await db.collection('users').updateOne(
            { walletAddress },
            {
                $set: {
                    lastPphClaim: now,
                    updatedAt: now
                },
                $inc: { totalPphEarned: accumulated }
            }
        )

        // Add to game balance
        await db.collection('game_balances').updateOne(
            { walletAddress },
            {
                $inc: {
                    gameBalance: accumulated,
                    totalEarned: accumulated
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        )

        // Create notification
        await db.collection('notifications').insertOne({
            userId: walletAddress,
            type: 'pph_claim',
            title: '💰 Passive Income Claimed!',
            message: `You claimed ${accumulated} $GAME from your hourly income.`,
            data: { amount: accumulated, level },
            read: false,
            dismissed: false,
            createdAt: now
        })

        await client.close()

        return NextResponse.json({
            success: true,
            claimed: accumulated,
            level,
            message: `Claimed ${accumulated} $GAME!`
        })

    } catch (error) {
        console.error('PPH POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
