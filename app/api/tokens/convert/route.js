import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Conversion rate: 100 $GAME = 1 $CHESS
const GAME_TO_CHESS_RATE = 100
const MIN_CONVERSION = 100 // Minimum $GAME to convert

/**
 * GET /api/tokens/convert?wallet=xxx
 * Get conversion info and user balances
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

        const balance = await db.collection('game_balances').findOne({ walletAddress })

        await client.close()

        const gameBalance = balance?.gameBalance || 0
        const chessBalance = balance?.chessBalance || 0
        const maxConvertible = Math.floor(gameBalance / GAME_TO_CHESS_RATE)

        return NextResponse.json({
            walletAddress,
            balances: {
                game: gameBalance,
                chess: chessBalance
            },
            conversion: {
                rate: GAME_TO_CHESS_RATE,
                rateLabel: `${GAME_TO_CHESS_RATE} $GAME = 1 $CHESS`,
                minConversion: MIN_CONVERSION,
                maxConvertible,
                canConvert: gameBalance >= MIN_CONVERSION
            }
        })

    } catch (error) {
        console.error('Convert GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/tokens/convert
 * Convert $GAME to $CHESS (burns $GAME)
 * Body: { walletAddress, gameAmount }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, gameAmount } = body

        if (!walletAddress || !gameAmount) {
            return NextResponse.json(
                { error: 'walletAddress and gameAmount required' },
                { status: 400 }
            )
        }

        const amount = parseInt(gameAmount)

        if (amount < MIN_CONVERSION) {
            return NextResponse.json(
                { error: `Minimum conversion is ${MIN_CONVERSION} $GAME` },
                { status: 400 }
            )
        }

        if (amount % GAME_TO_CHESS_RATE !== 0) {
            return NextResponse.json(
                { error: `Amount must be multiple of ${GAME_TO_CHESS_RATE}` },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Check balance
        const balance = await db.collection('game_balances').findOne({ walletAddress })
        const gameBalance = balance?.gameBalance || 0

        if (gameBalance < amount) {
            await client.close()
            return NextResponse.json(
                { error: 'Insufficient $GAME balance', current: gameBalance, required: amount },
                { status: 400 }
            )
        }

        const chessToReceive = amount / GAME_TO_CHESS_RATE
        const now = new Date()

        // Burn $GAME, credit $CHESS
        await db.collection('game_balances').updateOne(
            { walletAddress },
            {
                $inc: {
                    gameBalance: -amount,        // Burn GAME
                    chessBalance: chessToReceive // Credit CHESS
                },
                $set: { updatedAt: now }
            }
        )

        // Record conversion
        await db.collection('conversions').insertOne({
            walletAddress,
            gameBurned: amount,
            chessReceived: chessToReceive,
            rate: GAME_TO_CHESS_RATE,
            createdAt: now
        })

        // Notification
        await db.collection('notifications').insertOne({
            userId: walletAddress,
            type: 'conversion',
            title: '🔄 Conversion Complete!',
            message: `Converted ${amount.toLocaleString()} $GAME → ${chessToReceive.toLocaleString()} $CHESS`,
            data: { gameBurned: amount, chessReceived: chessToReceive },
            read: false,
            dismissed: false,
            createdAt: now
        })

        // Get updated balance
        const newBalance = await db.collection('game_balances').findOne({ walletAddress })

        await client.close()

        return NextResponse.json({
            success: true,
            conversion: {
                gameBurned: amount,
                chessReceived: chessToReceive,
                rate: `${GAME_TO_CHESS_RATE}:1`
            },
            newBalances: {
                game: newBalance?.gameBalance || 0,
                chess: newBalance?.chessBalance || 0
            },
            message: `Converted ${amount} $GAME to ${chessToReceive} $CHESS!`
        })

    } catch (error) {
        console.error('Convert POST error:', error)
        return NextResponse.json(
            { error: 'Conversion failed', details: error.message },
            { status: 500 }
        )
    }
}
