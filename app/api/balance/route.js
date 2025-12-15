import { NextResponse } from 'next/server'

// Shared in-memory storage for balances
const getBalancesStorage = () => {
    if (!global.balancesStorage) {
        global.balancesStorage = {}
    }
    return global.balancesStorage
}

// Try MongoDB, fallback to in-memory
async function getDb() {
    try {
        const { MongoClient } = await import('mongodb')
        const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
        const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
        await client.connect()
        return { db: client.db("dao_chess"), client, isMemory: false }
    } catch (error) {
        console.log('MongoDB unavailable, using in-memory storage for balances')
        return { db: null, client: null, isMemory: true }
    }
}

// Get user balance
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

        const { db, client, isMemory } = await getDb()

        let balanceData = null

        if (isMemory) {
            const storage = getBalancesStorage()
            if (!storage[walletAddress]) {
                // New user gets starting bonus
                storage[walletAddress] = {
                    chessBalance: 1000,
                    gameBalance: 500,
                    solBalance: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
            balanceData = storage[walletAddress]
        } else {
            let balanceDoc = await db.collection('balances').findOne({ walletAddress })

            if (!balanceDoc) {
                balanceDoc = {
                    walletAddress,
                    chessBalance: 1000,
                    gameBalance: 500,
                    solBalance: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
                await db.collection('balances').insertOne(balanceDoc)
            }

            balanceData = balanceDoc
            await client.close()
        }

        return NextResponse.json({
            success: true,
            walletAddress,
            chessBalance: balanceData.chessBalance || 0,
            gameBalance: balanceData.gameBalance || 0,
            solBalance: balanceData.solBalance || 0,
            lastUpdated: balanceData.updatedAt
        })
    } catch (error) {
        console.error('Balance API error:', error)
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')

        return NextResponse.json({
            success: true,
            walletAddress,
            chessBalance: 1000,
            gameBalance: 500,
            solBalance: 0,
            demo: true
        })
    }
}

// Update balance
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, amount, operation = 'add', type = 'chess' } = body

        if (!walletAddress || amount === undefined) {
            return NextResponse.json(
                { error: 'walletAddress and amount are required' },
                { status: 400 }
            )
        }

        const { db, client, isMemory } = await getDb()

        let newBalance = 0
        const balanceField = type === 'game' ? 'gameBalance' : 'chessBalance'

        if (isMemory) {
            const storage = getBalancesStorage()
            if (!storage[walletAddress]) {
                storage[walletAddress] = {
                    chessBalance: 1000,
                    gameBalance: 500,
                    solBalance: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }

            if (operation === 'set') {
                storage[walletAddress][balanceField] = amount
            } else if (operation === 'subtract') {
                storage[walletAddress][balanceField] = Math.max(0, (storage[walletAddress][balanceField] || 0) - amount)
            } else {
                storage[walletAddress][balanceField] = (storage[walletAddress][balanceField] || 0) + amount
            }

            storage[walletAddress].updatedAt = new Date()
            newBalance = storage[walletAddress][balanceField]
        } else {
            const updateOp = operation === 'set'
                ? { $set: { [balanceField]: amount, updatedAt: new Date() } }
                : { $inc: { [balanceField]: operation === 'subtract' ? -amount : amount }, $set: { updatedAt: new Date() } }

            await db.collection('balances').updateOne(
                { walletAddress },
                updateOp,
                { upsert: true }
            )

            const updatedDoc = await db.collection('balances').findOne({ walletAddress })
            newBalance = updatedDoc[balanceField]
            await client.close()
        }

        console.log(`💰 Balance updated: ${walletAddress.slice(0, 8)}... ${balanceField}: ${newBalance}`)

        return NextResponse.json({
            success: true,
            walletAddress,
            newBalance,
            type
        })
    } catch (error) {
        console.error('Balance update error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update balance', details: error.message },
            { status: 500 }
        )
    }
}

