import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * TON Payment Verification API
 *
 * Checks the TON blockchain to verify if a payment was received
 * and credits CHESS tokens to the user.
 *
 * De-duplication is persisted (per transaction hash) in the `ton_payments`
 * collection when Mongo is available. The previous in-memory `Set` was reset
 * on every restart, so the same on-chain payment could be credited again after
 * a redeploy. It also keyed on paymentId only, letting one transaction be
 * reused for multiple payment ids.
 */

const TONCENTER_API = process.env.TON_NETWORK === 'mainnet'
    ? 'https://toncenter.com/api/v2'
    : 'https://testnet.toncenter.com/api/v2'

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || ''
const PAYMENT_WALLET = process.env.TON_PAYMENT_WALLET || 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI'

// In-memory fallback for when Mongo is not configured.
function memProcessed() {
    if (!global.__tonProcessed) global.__tonProcessed = new Set()
    return global.__tonProcessed
}

/** Has this on-chain transaction already been credited? (persistent) */
async function isTxProcessed(txHash) {
    const db = await getDb()
    if (!db) return memProcessed().has(txHash)
    const existing = await db.collection('ton_payments').findOne({ txHash })
    return !!existing
}

/** Atomically record a credited transaction; returns false if it already existed. */
async function markTxProcessed({ txHash, paymentId, userId, amount, sender }) {
    const db = await getDb()
    if (!db) {
        const store = memProcessed()
        if (store.has(txHash)) return false
        store.add(txHash)
        return true
    }
    try {
        await db.collection('ton_payments').insertOne({
            txHash,
            paymentId,
            userId,
            amount,
            sender,
            createdAt: new Date(),
        })
        return true
    } catch (err) {
        // Duplicate key (unique index on txHash) => already processed.
        if (err?.code === 11000) return false
        throw err
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { paymentId, userId, expectedAmount } = body

        if (!paymentId || !userId) {
            return NextResponse.json(
                { error: 'Payment ID and User ID required' },
                { status: 400 }
            )
        }

        // Fetch recent transactions to our wallet
        const txResponse = await fetch(
            `${TONCENTER_API}/getTransactions?address=${PAYMENT_WALLET}&limit=50&api_key=${TONCENTER_API_KEY}`
        )

        if (!txResponse.ok) {
            console.error('TonCenter API error:', await txResponse.text())
            return NextResponse.json(
                { error: 'Failed to check blockchain' },
                { status: 500 }
            )
        }

        const txData = await txResponse.json()

        if (!txData.ok || !txData.result) {
            return NextResponse.json({
                verified: false,
                message: 'No transactions found'
            })
        }

        // Look for matching transaction
        const matchingTx = txData.result.find(tx => {
            // Check incoming messages
            if (!tx.in_msg) return false

            // Check if message contains our payment ID
            const comment = tx.in_msg.message || ''
            if (!comment.includes(paymentId)) return false

            // Verify amount if provided
            if (expectedAmount) {
                const receivedTon = parseInt(tx.in_msg.value || 0) / 1e9
                if (receivedTon < expectedAmount * 0.99) return false // Allow 1% variance
            }

            return true
        })

        if (matchingTx) {
            const receivedAmount = parseInt(matchingTx.in_msg.value || 0) / 1e9
            const senderAddress = matchingTx.in_msg.source
            const txHash = matchingTx.transaction_id?.hash || `${paymentId}:${matchingTx.transaction_id?.lt || ''}`

            // Idempotency: this exact on-chain transaction must be credited at
            // most once, even across restarts and even if the same tx is
            // presented under a different paymentId.
            if (await isTxProcessed(txHash)) {
                return NextResponse.json({
                    verified: true,
                    alreadyCredited: true,
                    txHash,
                    message: 'Payment already verified and credited'
                })
            }

            const claimed = await markTxProcessed({
                txHash,
                paymentId,
                userId,
                amount: receivedAmount,
                sender: senderAddress,
            })
            if (!claimed) {
                return NextResponse.json({
                    verified: true,
                    alreadyCredited: true,
                    txHash,
                    message: 'Payment already verified and credited'
                })
            }

            console.log(`✅ Payment verified: ${paymentId} (tx ${txHash}) for ${userId}: ${receivedAmount} TON from ${senderAddress}`)

            // Credit tokens via our balance API
            try {
                await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/credit-tokens`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        paymentId,
                        source: 'ton',
                        tonAmount: receivedAmount,
                    })
                })
            } catch (creditError) {
                console.error('Failed to credit tokens:', creditError)
            }

            return NextResponse.json({
                verified: true,
                txHash,
                amount: receivedAmount,
                sender: senderAddress,
                message: 'Payment verified! CHESS tokens credited.'
            })
        }

        return NextResponse.json({
            verified: false,
            message: 'Payment not found yet. Please wait and try again.'
        })

    } catch (error) {
        console.error('Verification error:', error)
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        )
    }
}


// GET - Simple status check
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID required' }, { status: 400 })
    }

    let isVerified = false
    const db = await getDb()
    if (db) {
        isVerified = !!(await db.collection('ton_payments').findOne({ paymentId }))
    }

    return NextResponse.json({
        paymentId,
        verified: isVerified,
    })
}
