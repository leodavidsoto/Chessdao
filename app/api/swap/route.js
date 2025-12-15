import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { TOKEN_CONFIG, calculateChessToGame, calculateGameToChess, validateSwap, generateSwapId } from '@/lib/gameTokens'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

/**
 * POST /api/swap
 * Intercambia tokens entre $GAME y CHESS
 * 
 * Body:
 * - walletAddress: string
 * - fromToken: 'GAME' | 'CHESS'
 * - toToken: 'GAME' | 'CHESS'
 * - amount: number
 */
export async function POST(request) {
    const client = new MongoClient(MONGODB_URI)

    try {
        const body = await request.json()
        const { walletAddress, fromToken, toToken, amount } = body

        // Validaciones básicas
        if (!walletAddress) {
            return NextResponse.json(
                { error: 'walletAddress is required' },
                { status: 400 }
            )
        }

        if (!fromToken || !toToken) {
            return NextResponse.json(
                { error: 'fromToken and toToken are required' },
                { status: 400 }
            )
        }

        if (fromToken === toToken) {
            return NextResponse.json(
                { error: 'Cannot swap same token type' },
                { status: 400 }
            )
        }

        if (!['GAME', 'CHESS'].includes(fromToken) || !['GAME', 'CHESS'].includes(toToken)) {
            return NextResponse.json(
                { error: 'Invalid token type. Use GAME or CHESS' },
                { status: 400 }
            )
        }

        const swapAmount = parseFloat(amount)
        if (isNaN(swapAmount) || swapAmount <= 0) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400 }
            )
        }

        await client.connect()
        const db = client.db(DB_NAME)

        // Obtener balances actuales
        const gameBalanceDoc = await db.collection('game_balances').findOne({ walletAddress })
        const chessBalanceDoc = await db.collection('balances').findOne({ walletAddress })

        const gameBalance = gameBalanceDoc?.gameBalance || 0
        const chessBalance = chessBalanceDoc?.chessBalance || 0

        console.log(`🔄 Swap request: ${walletAddress}`)
        console.log(`   From: ${swapAmount} ${fromToken}`)
        console.log(`   Current balances: $GAME=${gameBalance}, CHESS=${chessBalance}`)

        // Calcular conversión y validar
        let calculation, userBalance
        if (fromToken === 'GAME') {
            calculation = calculateGameToChess(swapAmount)
            userBalance = gameBalance
        } else {
            calculation = calculateChessToGame(swapAmount)
            userBalance = chessBalance
        }

        // Validar swap
        const validation = validateSwap(fromToken, swapAmount, userBalance)
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.errors.join(', '), validation },
                { status: 400 }
            )
        }

        // Generar ID de transacción
        const swapId = generateSwapId()

        // Crear registro de swap
        const swapRecord = {
            swapId,
            walletAddress,
            fromToken,
            toToken,
            fromAmount: swapAmount,
            toAmount: calculation.netAmount,
            fee: calculation.fee,
            rate: fromToken === 'GAME'
                ? TOKEN_CONFIG.GAME_TO_CHESS_RATE
                : TOKEN_CONFIG.CHESS_TO_GAME_RATE,
            status: 'completed',
            createdAt: new Date()
        }

        // Ejecutar swap
        if (fromToken === 'GAME') {
            // GAME → CHESS
            // 1. Deducir $GAME
            await db.collection('game_balances').updateOne(
                { walletAddress },
                {
                    $inc: { gameBalance: -swapAmount, totalSwappedOut: swapAmount },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            )

            // 2. Añadir CHESS
            await db.collection('balances').updateOne(
                { walletAddress },
                {
                    $inc: { chessBalance: calculation.netAmount },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            )

            console.log(`   ✅ Converted ${swapAmount} $GAME → ${calculation.netAmount} CHESS (fee: ${calculation.fee})`)

        } else {
            // CHESS → GAME
            // 1. Deducir CHESS
            await db.collection('balances').updateOne(
                { walletAddress },
                {
                    $inc: { chessBalance: -swapAmount },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            )

            // 2. Añadir $GAME
            await db.collection('game_balances').updateOne(
                { walletAddress },
                {
                    $inc: { gameBalance: calculation.netAmount, totalSwappedIn: calculation.netAmount },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            )

            console.log(`   ✅ Converted ${swapAmount} CHESS → ${calculation.netAmount} $GAME (fee: ${calculation.fee})`)
        }

        // Guardar registro de swap
        await db.collection('swap_transactions').insertOne(swapRecord)

        // Obtener balances actualizados
        const newGameBalance = await db.collection('game_balances').findOne({ walletAddress })
        const newChessBalance = await db.collection('balances').findOne({ walletAddress })

        await client.close()

        return NextResponse.json({
            success: true,
            swapId,
            fromToken,
            toToken,
            fromAmount: swapAmount,
            toAmount: calculation.netAmount,
            fee: calculation.fee,
            newBalances: {
                gameBalance: newGameBalance?.gameBalance || 0,
                chessBalance: newChessBalance?.chessBalance || 0
            }
        })

    } catch (error) {
        console.error('Swap error:', error)
        await client.close()
        return NextResponse.json(
            { error: 'Swap failed', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * GET /api/swap?wallet=xxx
 * Obtiene historial de swaps del usuario
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')
        const limit = parseInt(searchParams.get('limit') || '10')

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const swaps = await db.collection('swap_transactions')
            .find({ walletAddress })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray()

        await client.close()

        return NextResponse.json({
            walletAddress,
            swaps: swaps.map(s => ({
                swapId: s.swapId,
                fromToken: s.fromToken,
                toToken: s.toToken,
                fromAmount: s.fromAmount,
                toAmount: s.toAmount,
                fee: s.fee,
                status: s.status,
                date: s.createdAt
            })),
            total: swaps.length
        })

    } catch (error) {
        console.error('Swap history error:', error)
        return NextResponse.json(
            { error: 'Failed to get swap history' },
            { status: 500 }
        )
    }
}
