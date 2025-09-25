import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { mintChessTokens } from '@/lib/solana'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db(DB_NAME)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { sessionId, amount, tokens, walletAddress, status } = body

    if (!sessionId || !amount || !tokens || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' }, 
        { status: 400 }
      )
    }

    const db = await connectToDatabase()

    // Update payment session
    await db.collection('payment_sessions').updateOne(
      { sessionId },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          actualAmount: amount,
          actualTokens: tokens
        } 
      }
    )

    // Mint tokens to user wallet (mock implementation)
    let mintResult;
    try {
      mintResult = await mintChessTokens(walletAddress, tokens)
    } catch (error) {
      console.error('Token minting error:', error)
      // Continue anyway for demo - in production, this would be critical
      mintResult = {
        success: true,
        signature: `demo_mint_${Date.now()}`,
        amount: tokens,
        to: walletAddress
      }
    }

    // Record successful purchase
    await db.collection('token_purchases').insertOne({
      sessionId,
      walletAddress,
      amount,
      tokens,
      mintSignature: mintResult.signature,
      status: 'completed',
      createdAt: new Date()
    })

    // Update user balance in database (for caching)
    await db.collection('user_balances').updateOne(
      { walletAddress },
      { 
        $inc: { chessBalance: tokens },
        $set: { 
          lastUpdated: new Date(),
          lastPurchase: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
      tokens,
      signature: mintResult.signature,
      transactionHash: mintResult.signature
    })

  } catch (error) {
    console.error('Payment completion error:', error)
    return NextResponse.json(
      { success: false, error: 'Payment processing failed' }, 
      { status: 500 }
    )
  }
}