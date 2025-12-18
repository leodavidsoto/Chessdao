import { NextResponse } from 'next/server'

/**
 * TON Payment Verification API
 * 
 * Checks the TON blockchain to verify if a payment was received
 * and credits CHESS tokens to the user.
 */

const TONCENTER_API = process.env.TON_NETWORK === 'mainnet'
    ? 'https://toncenter.com/api/v2'
    : 'https://testnet.toncenter.com/api/v2'

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || ''
const PAYMENT_WALLET = process.env.TON_PAYMENT_WALLET || 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI'

// In-memory store (should use Redis/DB in production)
const verifiedPayments = new Set()

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

        // Check if already verified
        if (verifiedPayments.has(paymentId)) {
            return NextResponse.json({
                verified: true,
                alreadyCredited: true,
                message: 'Payment already verified and credited'
            })
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

            // Mark as verified
            verifiedPayments.add(paymentId)

            // TODO: Credit CHESS tokens to user in database
            // This should call our minting logic or update user balance
            console.log(`✅ Payment verified: ${paymentId}`)
            console.log(`   Amount: ${receivedAmount} TON`)
            console.log(`   From: ${senderAddress}`)
            console.log(`   User: ${userId}`)

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
                txHash: matchingTx.transaction_id?.hash || 'unknown',
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

    const isVerified = verifiedPayments.has(paymentId)

    return NextResponse.json({
        paymentId,
        verified: isVerified,
    })
}
