import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Level upgrade costs
const UPGRADE_COSTS = {
    bronze: { nextLevel: 'silver', cost: 1000, pphIncrease: 15 },
    silver: { nextLevel: 'gold', cost: 5000, pphIncrease: 25 },
    gold: { nextLevel: 'platinum', cost: 20000, pphIncrease: 50 },
    platinum: { nextLevel: 'diamond', cost: 50000, pphIncrease: 100 },
    diamond: { nextLevel: 'master', cost: 100000, pphIncrease: 300 },
    master: { nextLevel: null, cost: null, pphIncrease: 0 }
}

const LEVEL_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master']

/**
 * POST /api/user/upgrade
 * Purchase level upgrade with $GAME tokens
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

        const currentLevel = user.pphLevel || 'bronze'
        const upgradeInfo = UPGRADE_COSTS[currentLevel]

        if (!upgradeInfo.nextLevel) {
            await client.close()
            return NextResponse.json({
                error: 'Already at max level!',
                level: currentLevel
            }, { status: 400 })
        }

        // Check balance
        const balance = await db.collection('game_balances').findOne({ walletAddress })
        const gameBalance = balance?.gameBalance || 0

        if (gameBalance < upgradeInfo.cost) {
            await client.close()
            return NextResponse.json({
                error: 'Insufficient $GAME balance',
                required: upgradeInfo.cost,
                current: gameBalance
            }, { status: 400 })
        }

        const now = new Date()

        // Deduct cost
        await db.collection('game_balances').updateOne(
            { walletAddress },
            {
                $inc: {
                    gameBalance: -upgradeInfo.cost,
                    totalSpent: upgradeInfo.cost
                },
                $set: { updatedAt: now }
            }
        )

        // Upgrade level
        await db.collection('users').updateOne(
            { walletAddress },
            {
                $set: {
                    pphLevel: upgradeInfo.nextLevel,
                    updatedAt: now
                }
            }
        )

        // Track upgrade for analytics
        await db.collection('upgrades').insertOne({
            walletAddress,
            fromLevel: currentLevel,
            toLevel: upgradeInfo.nextLevel,
            cost: upgradeInfo.cost,
            createdAt: now
        })

        // Create notification
        await db.collection('notifications').insertOne({
            userId: walletAddress,
            type: 'level_up',
            title: `⬆️ Upgraded to ${upgradeInfo.nextLevel.toUpperCase()}!`,
            message: `You now earn ${upgradeInfo.pphIncrease} more $GAME per hour!`,
            data: {
                fromLevel: currentLevel,
                toLevel: upgradeInfo.nextLevel,
                cost: upgradeInfo.cost
            },
            read: false,
            dismissed: false,
            createdAt: now
        })

        await client.close()

        return NextResponse.json({
            success: true,
            previousLevel: currentLevel,
            newLevel: upgradeInfo.nextLevel,
            cost: upgradeInfo.cost,
            message: `Upgraded to ${upgradeInfo.nextLevel}!`
        })

    } catch (error) {
        console.error('Upgrade error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * GET /api/user/upgrade?wallet=xxx
 * Get upgrade info and costs
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
        const balance = await db.collection('game_balances').findOne({ walletAddress })

        await client.close()

        const currentLevel = user?.pphLevel || 'bronze'
        const gameBalance = balance?.gameBalance || 0
        const upgradeInfo = UPGRADE_COSTS[currentLevel]

        return NextResponse.json({
            currentLevel,
            currentLevelIndex: LEVEL_ORDER.indexOf(currentLevel),
            nextLevel: upgradeInfo.nextLevel,
            upgradeCost: upgradeInfo.cost,
            canAfford: gameBalance >= (upgradeInfo.cost || 0),
            gameBalance,
            allLevels: LEVEL_ORDER.map((lvl, idx) => ({
                level: lvl,
                index: idx,
                cost: UPGRADE_COSTS[LEVEL_ORDER[idx - 1]]?.cost || 0,
                isUnlocked: idx <= LEVEL_ORDER.indexOf(currentLevel),
                isCurrent: lvl === currentLevel
            }))
        })

    } catch (error) {
        console.error('Upgrade GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
