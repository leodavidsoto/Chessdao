import { NextResponse } from 'next/server'

// In-memory fallback storage
const getTransactionsStorage = () => {
    if (!global.transactionsStorage) {
        global.transactionsStorage = {
            transactions: [],
            balances: {}
        }
    }
    return global.transactionsStorage
}

// Try MongoDB, fallback to in-memory
async function getDb() {
    try {
        const { MongoClient } = await import('mongodb')
        const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        return { db: client.db("dao_chess"), client, isMemory: false }
    } catch (error) {
        console.log('MongoDB unavailable, using in-memory storage')
        return { db: null, client: null, isMemory: true }
    }
}

// Log a transaction
export async function POST(request) {
    try {
        const body = await request.json()
        const {
            walletAddress,
            type, // 'purchase', 'bet', 'win', 'transfer'
            amount,
            signature,
            metadata
        } = body

        if (!walletAddress || !type || amount === undefined) {
            return NextResponse.json(
                { error: 'walletAddress, type, and amount are required' },
                { status: 400 }
            )
        }

        const transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            walletAddress,
            type,
            amount,
            signature: signature || `tx_${Date.now()}`,
            metadata: metadata || {},
            status: 'completed',
            createdAt: new Date()
        }

        const { db, client, isMemory } = await getDb()

        if (isMemory) {
            // In-memory storage
            const storage = getTransactionsStorage()
            storage.transactions.push(transaction)

            // Update balance
            if (!storage.balances[walletAddress]) {
                storage.balances[walletAddress] = { chessBalance: 0, gameBalance: 1000 }
            }

            const balanceChange = (type === 'purchase' || type === 'win') ? amount : -amount
            storage.balances[walletAddress].chessBalance =
                Math.max(0, (storage.balances[walletAddress].chessBalance || 0) + balanceChange)
        } else {
            // MongoDB storage
            await db.collection('transactions').insertOne(transaction)
            await db.collection('balances').updateOne(
                { walletAddress },
                {
                    $inc: {
                        chessBalance: type === 'purchase' || type === 'win' ? amount : -amount
                    },
                    $setOnInsert: { createdAt: new Date() },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            )
            await client.close()
        }

        console.log(`📝 Transaction logged: ${type} of ${amount} CHESS for ${walletAddress.slice(0, 8)}...`)

        return NextResponse.json({
            success: true,
            transaction,
            message: `Transaction logged: ${type} of ${amount} CHESS`
        })
    } catch (error) {
        console.error('Transaction logging error:', error)
        return NextResponse.json(
            { error: 'Failed to log transaction', details: error.message },
            { status: 500 }
        )
    }
}

// Get transactions for a wallet
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')
        const type = searchParams.get('type')
        const limit = parseInt(searchParams.get('limit') || '50')

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const { db, client, isMemory } = await getDb()

        let transactions = []
        let balance = 0

        if (isMemory) {
            const storage = getTransactionsStorage()
            transactions = storage.transactions
                .filter(t => t.walletAddress === walletAddress)
                .filter(t => !type || t.type === type)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit)

            balance = storage.balances[walletAddress]?.chessBalance || 0
        } else {
            const query = { walletAddress }
            if (type) query.type = type

            transactions = await db.collection('transactions')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray()

            const balanceDoc = await db.collection('balances').findOne({ walletAddress })
            balance = balanceDoc?.chessBalance || 0
            await client.close()
        }

        return NextResponse.json({
            transactions,
            balance,
            total: transactions.length
        })
    } catch (error) {
        console.error('Get transactions error:', error)
        // Return empty on error instead of failing
        return NextResponse.json({
            transactions: [],
            balance: 0,
            total: 0
        })
    }
}

