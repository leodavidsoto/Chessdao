import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

// Configuración inicial
const INITIAL_GAME_BALANCE = 500

/**
 * GET /api/game-balance?wallet=xxx
 * Obtiene el balance de $GAME tokens de un usuario
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

        // Buscar balance de $GAME
        let balanceDoc = await db.collection('game_balances').findOne({ walletAddress })

        // Si no existe, crear balance inicial
        if (!balanceDoc) {
            balanceDoc = {
                walletAddress,
                gameBalance: INITIAL_GAME_BALANCE,
                totalEarned: 0,
                totalSpent: 0,
                totalSwappedIn: 0,
                totalSwappedOut: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            await db.collection('game_balances').insertOne(balanceDoc)
            console.log(`🎮 Created new $GAME balance for ${walletAddress}: ${INITIAL_GAME_BALANCE}`)
        }

        await client.close()

        return NextResponse.json({
            walletAddress,
            gameBalance: balanceDoc.gameBalance || 0,
            stats: {
                totalEarned: balanceDoc.totalEarned || 0,
                totalSpent: balanceDoc.totalSpent || 0,
                totalSwappedIn: balanceDoc.totalSwappedIn || 0,
                totalSwappedOut: balanceDoc.totalSwappedOut || 0
            },
            lastUpdated: balanceDoc.updatedAt
        })
    } catch (error) {
        console.error('Game Balance API error:', error)

        // Fallback para modo demo
        return NextResponse.json({
            gameBalance: INITIAL_GAME_BALANCE,
            demo: true,
            error: 'MongoDB unavailable, showing demo balance'
        })
    }
}

/**
 * POST /api/game-balance
 * Actualiza el balance de $GAME de un usuario
 * 
 * Body:
 * - walletAddress: string
 * - amount: number
 * - operation: 'add' | 'subtract' | 'set'
 * - type: 'bet' | 'win' | 'swap_in' | 'swap_out' | 'purchase' (opcional)
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, amount, operation = 'add', type = 'other' } = body

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'walletAddress is required' },
                { status: 400 }
            )
        }

        if (amount === undefined || amount === null) {
            return NextResponse.json(
                { error: 'amount is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Verificar balance actual para operación subtract
        if (operation === 'subtract') {
            const current = await db.collection('game_balances').findOne({ walletAddress })
            const currentBalance = current?.gameBalance || 0

            if (currentBalance < amount) {
                await client.close()
                return NextResponse.json(
                    { error: 'Insufficient $GAME balance', currentBalance },
                    { status: 400 }
                )
            }
        }

        // Preparar actualización
        let updateOp
        const statsUpdate = {}

        switch (operation) {
            case 'set':
                updateOp = {
                    $set: { gameBalance: amount, updatedAt: new Date() }
                }
                break
            case 'subtract':
                updateOp = {
                    $inc: { gameBalance: -Math.abs(amount) },
                    $set: { updatedAt: new Date() }
                }
                // Actualizar estadísticas
                if (type === 'bet') statsUpdate.totalSpent = Math.abs(amount)
                if (type === 'swap_out') statsUpdate.totalSwappedOut = Math.abs(amount)
                break
            case 'add':
            default:
                updateOp = {
                    $inc: { gameBalance: Math.abs(amount) },
                    $set: { updatedAt: new Date() }
                }
                // Actualizar estadísticas
                if (type === 'win') statsUpdate.totalEarned = Math.abs(amount)
                if (type === 'swap_in') statsUpdate.totalSwappedIn = Math.abs(amount)
                if (type === 'purchase') statsUpdate.totalEarned = Math.abs(amount)
                break
        }

        // Añadir incremento de estadísticas si hay
        if (Object.keys(statsUpdate).length > 0) {
            updateOp.$inc = { ...updateOp.$inc, ...statsUpdate }
        }

        // Ejecutar actualización
        await db.collection('game_balances').updateOne(
            { walletAddress },
            updateOp,
            { upsert: true }
        )

        // Obtener balance actualizado
        const updatedDoc = await db.collection('game_balances').findOne({ walletAddress })
        await client.close()

        console.log(`🎮 Updated $GAME balance for ${walletAddress}: ${operation} ${amount} → ${updatedDoc.gameBalance}`)

        return NextResponse.json({
            success: true,
            walletAddress,
            operation,
            amount,
            newBalance: updatedDoc.gameBalance,
            previousBalance: operation === 'add'
                ? updatedDoc.gameBalance - amount
                : updatedDoc.gameBalance + amount
        })
    } catch (error) {
        console.error('Game Balance update error:', error)
        return NextResponse.json(
            { error: 'Failed to update $GAME balance', details: error.message },
            { status: 500 }
        )
    }
}
