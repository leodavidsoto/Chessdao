import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Base profit rate: 10 $GAME per hour
const BASE_PROFIT_RATE = 10

// Max accumulation time: 3 hours (user must claim to reset)
const MAX_ACCUMULATION_HOURS = 3

// Profit multipliers based on upgrades
const PROFIT_MULTIPLIERS = {
    bronze: 1,      // Default
    silver: 1.5,    // 500 CHESS to upgrade
    gold: 2,        // 2000 CHESS to upgrade
    platinum: 3,    // 5000 CHESS to upgrade
    diamond: 5      // 15000 CHESS to upgrade
}

const UPGRADE_COSTS = {
    silver: 500,
    gold: 2000,
    platinum: 5000,
    diamond: 15000
}

/**
 * GET /api/passive-income
 * Get user's passive income status
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

        // Get or create passive income record
        let incomeData = await db.collection('passive_income').findOne({ walletAddress })

        if (!incomeData) {
            // Create new record
            const now = new Date()
            incomeData = {
                walletAddress,
                level: 'bronze',
                profitPerHour: BASE_PROFIT_RATE,
                lastClaimAt: now,
                totalClaimed: 0,
                claimCount: 0,
                createdAt: now
            }
            await db.collection('passive_income').insertOne(incomeData)
        }

        // Calculate pending income
        const now = new Date()
        const hoursSinceLastClaim = (now - new Date(incomeData.lastClaimAt)) / (1000 * 60 * 60)
        const cappedHours = Math.min(hoursSinceLastClaim, MAX_ACCUMULATION_HOURS)

        const multiplier = PROFIT_MULTIPLIERS[incomeData.level] || 1
        const effectiveRate = BASE_PROFIT_RATE * multiplier
        const pendingAmount = Math.floor(cappedHours * effectiveRate)

        // Calculate time until max accumulation
        const timeUntilMax = Math.max(0, MAX_ACCUMULATION_HOURS - hoursSinceLastClaim)
        const isCapped = hoursSinceLastClaim >= MAX_ACCUMULATION_HOURS

        await client.close()

        return NextResponse.json({
            success: true,
            currentLevel: incomeData.level,
            profitPerHour: effectiveRate,
            baseProfitPerHour: BASE_PROFIT_RATE,
            multiplier,
            pendingAmount,
            isCapped,
            hoursSinceLastClaim: Math.min(cappedHours, MAX_ACCUMULATION_HOURS),
            maxAccumulationHours: MAX_ACCUMULATION_HOURS,
            timeUntilMaxMinutes: Math.floor(timeUntilMax * 60),
            lastClaimAt: incomeData.lastClaimAt,
            totalClaimed: incomeData.totalClaimed,
            claimCount: incomeData.claimCount,
            upgrades: Object.entries(UPGRADE_COSTS).map(([level, cost]) => ({
                level,
                cost,
                multiplier: PROFIT_MULTIPLIERS[level],
                profitPerHour: BASE_PROFIT_RATE * PROFIT_MULTIPLIERS[level],
                unlocked: isLevelHigherOrEqual(incomeData.level, level)
            }))
        })

    } catch (error) {
        console.error('Passive income GET error:', error)
        return NextResponse.json(
            { error: 'Failed to get passive income data', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/passive-income
 * Claim accumulated passive income
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress } = body

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'walletAddress is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Get current income data
        const incomeData = await db.collection('passive_income').findOne({ walletAddress })

        if (!incomeData) {
            await client.close()
            return NextResponse.json(
                { error: 'No passive income record found. Visit the app first.' },
                { status: 404 }
            )
        }

        // Calculate claimable amount
        const now = new Date()
        const hoursSinceLastClaim = (now - new Date(incomeData.lastClaimAt)) / (1000 * 60 * 60)
        const cappedHours = Math.min(hoursSinceLastClaim, MAX_ACCUMULATION_HOURS)

        const multiplier = PROFIT_MULTIPLIERS[incomeData.level] || 1
        const effectiveRate = BASE_PROFIT_RATE * multiplier
        const claimAmount = Math.floor(cappedHours * effectiveRate)

        if (claimAmount < 1) {
            await client.close()
            return NextResponse.json({
                success: false,
                error: 'Not enough accumulated. Wait at least a few minutes.',
                pendingAmount: claimAmount,
                minutesUntilMinimum: Math.ceil((1 / effectiveRate) * 60)
            })
        }

        // Update passive income record
        await db.collection('passive_income').updateOne(
            { walletAddress },
            {
                $set: { lastClaimAt: now },
                $inc: {
                    totalClaimed: claimAmount,
                    claimCount: 1
                }
            }
        )

        // Credit $GAME tokens to user
        await db.collection('balances').updateOne(
            { walletAddress },
            {
                $inc: { gameBalance: claimAmount },
                $set: { updatedAt: now },
                $setOnInsert: {
                    chessBalance: 0,
                    createdAt: now
                }
            },
            { upsert: true }
        )

        // Log the claim
        await db.collection('income_claims').insertOne({
            walletAddress,
            amount: claimAmount,
            level: incomeData.level,
            hoursClaimed: cappedHours,
            claimedAt: now
        })

        await client.close()

        console.log(`💰 Passive income claimed: ${walletAddress.slice(0, 8)}... got ${claimAmount} $GAME`)

        return NextResponse.json({
            success: true,
            claimed: claimAmount,
            hoursClaimed: cappedHours.toFixed(2),
            newClaimCount: incomeData.claimCount + 1,
            totalClaimed: incomeData.totalClaimed + claimAmount,
            nextClaimAvailable: 'Now',
            message: `¡Reclamaste ${claimAmount} $GAME!`
        })

    } catch (error) {
        console.error('Passive income claim error:', error)
        return NextResponse.json(
            { error: 'Failed to claim passive income', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/passive-income
 * Upgrade passive income level
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { walletAddress, targetLevel } = body

        if (!walletAddress || !targetLevel) {
            return NextResponse.json(
                { error: 'walletAddress and targetLevel are required' },
                { status: 400 }
            )
        }

        if (!UPGRADE_COSTS[targetLevel]) {
            return NextResponse.json(
                { error: 'Invalid target level' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Get current data
        const [incomeData, balanceData] = await Promise.all([
            db.collection('passive_income').findOne({ walletAddress }),
            db.collection('balances').findOne({ walletAddress })
        ])

        if (!incomeData) {
            await client.close()
            return NextResponse.json(
                { error: 'No passive income record found' },
                { status: 404 }
            )
        }

        // Check if already at or above target level
        if (isLevelHigherOrEqual(incomeData.level, targetLevel)) {
            await client.close()
            return NextResponse.json({
                success: false,
                error: 'Ya tienes este nivel o uno superior'
            })
        }

        // Check balance
        const cost = UPGRADE_COSTS[targetLevel]
        const currentChess = balanceData?.chessBalance || 0

        if (currentChess < cost) {
            await client.close()
            return NextResponse.json({
                success: false,
                error: `Necesitas ${cost} CHESS para mejorar. Tienes ${currentChess}.`,
                required: cost,
                current: currentChess
            })
        }

        // Perform upgrade
        const now = new Date()
        const newProfitRate = BASE_PROFIT_RATE * PROFIT_MULTIPLIERS[targetLevel]

        await Promise.all([
            // Update level
            db.collection('passive_income').updateOne(
                { walletAddress },
                {
                    $set: {
                        level: targetLevel,
                        profitPerHour: newProfitRate,
                        upgradedAt: now
                    }
                }
            ),
            // Deduct CHESS tokens
            db.collection('balances').updateOne(
                { walletAddress },
                {
                    $inc: { chessBalance: -cost },
                    $set: { updatedAt: now }
                }
            ),
            // Log upgrade
            db.collection('upgrades').insertOne({
                walletAddress,
                type: 'passive_income',
                fromLevel: incomeData.level,
                toLevel: targetLevel,
                cost,
                createdAt: now
            })
        ])

        await client.close()

        console.log(`⬆️ Passive income upgraded: ${walletAddress.slice(0, 8)}... upgraded to ${targetLevel}`)

        return NextResponse.json({
            success: true,
            newLevel: targetLevel,
            newProfitPerHour: newProfitRate,
            multiplier: PROFIT_MULTIPLIERS[targetLevel],
            costPaid: cost,
            message: `¡Mejoraste a ${targetLevel}! Ahora ganas ${newProfitRate} $GAME/hora`
        })

    } catch (error) {
        console.error('Passive income upgrade error:', error)
        return NextResponse.json(
            { error: 'Failed to upgrade', details: error.message },
            { status: 500 }
        )
    }
}

// Helper to compare levels
function isLevelHigherOrEqual(currentLevel, targetLevel) {
    const levels = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
    return levels.indexOf(currentLevel) >= levels.indexOf(targetLevel)
}
