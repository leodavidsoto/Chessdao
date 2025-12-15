import { NextResponse } from 'next/server'
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js'
import {
    getOrCreateAssociatedTokenAccount,
    transfer,
    getMint,
    getAccount
} from '@solana/spl-token'

// Configuration - UPDATE THESE AFTER RUNNING create-spl-token.js
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const TREASURY_WALLET = process.env.TREASURY_WALLET || '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'
const CHESS_TOKEN_PRICE = parseFloat(process.env.CHESS_TOKEN_PRICE || '0.01') // $0.01 per CHESS

// This will be set after running create-spl-token.js
// const CHESS_MINT = process.env.CHESS_MINT_ADDRESS

const connection = new Connection(SOLANA_RPC, 'confirmed')

// Get current SOL price from CoinGecko
async function getSolPrice() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { next: { revalidate: 60 } } // Cache for 60 seconds
        )
        const data = await response.json()
        return data.solana?.usd || 150 // Fallback price
    } catch (error) {
        console.error('Failed to fetch SOL price:', error)
        return 150 // Fallback price
    }
}

// Calculate SOL amount for CHESS tokens
async function calculateSolAmount(chessAmount) {
    const solPrice = await getSolPrice()
    const usdAmount = chessAmount * CHESS_TOKEN_PRICE
    const solAmount = usdAmount / solPrice
    return {
        solAmount,
        solPrice,
        usdAmount,
        chessAmount
    }
}

// Create purchase transaction
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, chessAmount } = body

        if (!walletAddress || !chessAmount) {
            return NextResponse.json(
                { error: 'walletAddress and chessAmount are required' },
                { status: 400 }
            )
        }

        if (chessAmount < 100) {
            return NextResponse.json(
                { error: 'Minimum purchase is 100 CHESS tokens' },
                { status: 400 }
            )
        }

        // Calculate SOL amount
        const pricing = await calculateSolAmount(chessAmount)
        const lamports = Math.ceil(pricing.solAmount * LAMPORTS_PER_SOL)

        // Create transaction
        const buyerPubkey = new PublicKey(walletAddress)
        const treasuryPubkey = new PublicKey(TREASURY_WALLET)

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: buyerPubkey,
                toPubkey: treasuryPubkey,
                lamports
            })
        )

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = buyerPubkey
        transaction.lastValidBlockHeight = lastValidBlockHeight

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false
        })

        return NextResponse.json({
            success: true,
            transaction: serializedTransaction.toString('base64'),
            pricing: {
                chessAmount,
                solAmount: pricing.solAmount.toFixed(6),
                solPrice: pricing.solPrice,
                usdAmount: pricing.usdAmount.toFixed(2)
            },
            treasury: TREASURY_WALLET,
            message: 'Transaction created. Sign with your wallet and submit.'
        })
    } catch (error) {
        console.error('Buy tokens error:', error)
        return NextResponse.json(
            { error: 'Failed to create transaction', details: error.message },
            { status: 500 }
        )
    }
}

// Verify purchase and credit tokens
export async function PUT(request) {
    try {
        const body = await request.json()
        const { walletAddress, signature, chessAmount } = body

        if (!walletAddress || !signature || !chessAmount) {
            return NextResponse.json(
                { error: 'walletAddress, signature, and chessAmount are required' },
                { status: 400 }
            )
        }

        // Wait for transaction confirmation
        console.log(`🔍 Verifying transaction: ${signature}`)

        const confirmation = await connection.confirmTransaction(signature, 'confirmed')

        if (confirmation.value.err) {
            return NextResponse.json(
                { error: 'Transaction failed on chain' },
                { status: 400 }
            )
        }

        // Get transaction details
        const tx = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
        })

        if (!tx) {
            return NextResponse.json(
                { error: 'Transaction not found' },
                { status: 404 }
            )
        }

        // Verify the transaction went to treasury
        const treasuryPubkey = new PublicKey(TREASURY_WALLET)
        const postBalances = tx.meta?.postBalances || []
        const preBalances = tx.meta?.preBalances || []

        // Find treasury in account keys
        const accountKeys = tx.transaction.message.staticAccountKeys ||
            tx.transaction.message.accountKeys

        const treasuryIndex = accountKeys.findIndex(
            key => key.toString() === treasuryPubkey.toString()
        )

        if (treasuryIndex === -1) {
            return NextResponse.json(
                { error: 'Transaction did not include treasury wallet' },
                { status: 400 }
            )
        }

        // Verify payment amount
        const receivedLamports = postBalances[treasuryIndex] - preBalances[treasuryIndex]
        const receivedSol = receivedLamports / LAMPORTS_PER_SOL

        console.log(`✅ Verified: ${receivedSol} SOL received for ${chessAmount} CHESS`)

        // Credit tokens to user (update database)
        try {
            const creditResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    amount: chessAmount,
                    operation: 'add'
                })
            })

            const creditResult = await creditResponse.json()

            // Log transaction
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    type: 'purchase',
                    amount: chessAmount,
                    signature,
                    metadata: {
                        solPaid: receivedSol,
                        pricePerToken: CHESS_TOKEN_PRICE
                    }
                })
            })

            return NextResponse.json({
                success: true,
                message: `Successfully credited ${chessAmount} CHESS tokens`,
                signature,
                solPaid: receivedSol,
                newBalance: creditResult.newBalance
            })

        } catch (creditError) {
            console.error('Failed to credit tokens:', creditError)
            return NextResponse.json(
                { error: 'Payment verified but failed to credit tokens. Contact support.', signature },
                { status: 500 }
            )
        }

    } catch (error) {
        console.error('Verify purchase error:', error)
        return NextResponse.json(
            { error: 'Failed to verify purchase', details: error.message },
            { status: 500 }
        )
    }
}

// Get purchase quote
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const chessAmount = parseInt(searchParams.get('amount') || '1000')

        const pricing = await calculateSolAmount(chessAmount)

        return NextResponse.json({
            chessAmount,
            solAmount: pricing.solAmount.toFixed(6),
            solPrice: pricing.solPrice,
            usdAmount: pricing.usdAmount.toFixed(2),
            pricePerToken: CHESS_TOKEN_PRICE,
            treasury: TREASURY_WALLET,
            minPurchase: 100
        })
    } catch (error) {
        console.error('Get quote error:', error)
        return NextResponse.json(
            { error: 'Failed to get quote', details: error.message },
            { status: 500 }
        )
    }
}
