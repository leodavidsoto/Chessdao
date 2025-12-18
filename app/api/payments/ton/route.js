import { NextResponse } from 'next/server'

/**
 * TON Payment API - Process token purchases with TON
 * 
 * Flow:
 * 1. User selects a package (TON amount -> CHESS tokens)
 * 2. Frontend calls this API with package details
 * 3. API generates a payment address/memo
 * 4. User sends TON from their wallet
 * 5. Frontend polls /verify to check payment status
 * 6. Once confirmed, tokens are credited to user
 */

// TON token packages - same as frontend
const TON_PACKAGES = {
    '0.5': { chess: 500, usd: 2.50 },
    '1': { chess: 1000, usd: 5.00 },
    '2': { chess: 2200, usd: 10.00, bonus: 200 },
    '5': { chess: 5500, usd: 25.00, bonus: 500 },
    '10': { chess: 12000, usd: 50.00, bonus: 2000 },
}

// Our receiving wallet address (set in environment)
const PAYMENT_WALLET = process.env.TON_PAYMENT_WALLET || 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI'

// Simple in-memory store for pending payments (use Redis/DB in production)
const pendingPayments = new Map()

export async function POST(request) {
    try {
        const body = await request.json()
        const { tonAmount, userId, walletAddress } = body

        // Validate package exists
        const pkg = TON_PACKAGES[tonAmount.toString()]
        if (!pkg) {
            return NextResponse.json(
                { error: 'Invalid package amount' },
                { status: 400 }
            )
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID required' },
                { status: 400 }
            )
        }

        // Generate unique payment memo/comment
        const paymentId = `chess_${userId}_${Date.now()}`
        const chessAmount = pkg.chess + (pkg.bonus || 0)

        // Store pending payment
        pendingPayments.set(paymentId, {
            userId,
            walletAddress,
            tonAmount: parseFloat(tonAmount),
            chessAmount,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
        })

        // Return payment instructions
        return NextResponse.json({
            success: true,
            paymentId,
            paymentDetails: {
                address: PAYMENT_WALLET,
                amount: tonAmount,
                comment: paymentId, // User must include this in transaction
                chessTokens: chessAmount,
            },
            message: `Send ${tonAmount} TON to the address with the comment "${paymentId}"`
        })

    } catch (error) {
        console.error('TON payment error:', error)
        return NextResponse.json(
            { error: 'Payment processing failed' },
            { status: 500 }
        )
    }
}

// GET - Check payment status
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
        return NextResponse.json(
            { error: 'Payment ID required' },
            { status: 400 }
        )
    }

    const payment = pendingPayments.get(paymentId)
    if (!payment) {
        return NextResponse.json(
            { error: 'Payment not found' },
            { status: 404 }
        )
    }

    // Check if expired
    if (new Date() > new Date(payment.expiresAt)) {
        pendingPayments.delete(paymentId)
        return NextResponse.json({
            status: 'expired',
            message: 'Payment request expired'
        })
    }

    return NextResponse.json({
        status: payment.status,
        chessAmount: payment.chessAmount,
        tonAmount: payment.tonAmount,
        createdAt: payment.createdAt,
    })
}
