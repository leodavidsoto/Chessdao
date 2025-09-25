import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { mintChessTokens, verifyTokenDelivery } from '@/lib/solana'

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

    console.log(`💳 Processing payment completion for ${tokens} CHESS tokens to ${walletAddress}`)

    const db = await connectToDatabase()

    // Update payment session
    await db.collection('payment_sessions').updateOne(
      { sessionId },
      { 
        $set: { 
          status: 'processing',
          processingAt: new Date(),
          actualAmount: amount,
          actualTokens: tokens
        } 
      }
    )

    // REAL TOKEN TRANSFER - Mint tokens to user wallet
    let mintResult;
    try {
      console.log(`🪙 Initiating token mint to wallet: ${walletAddress}`)
      
      mintResult = await mintChessTokens(walletAddress, tokens)
      
      if (!mintResult.success) {
        throw new Error('Token minting failed: ' + mintResult.error)
      }
      
      console.log(`✅ Token mint successful!`)
      console.log(`📝 Signature: ${mintResult.signature}`)
      
    } catch (error) {
      console.error('❌ Token minting error:', error)
      
      // Update session as failed
      await db.collection('payment_sessions').updateOne(
        { sessionId },
        { $set: { status: 'failed', error: error.message, failedAt: new Date() }}
      )
      
      return NextResponse.json({
        success: false,
        error: 'Token delivery failed: ' + error.message
      }, { status: 500 })
    }

    // Verify token delivery
    try {
      console.log(`🔍 Verifying token delivery...`)
      
      const verification = await verifyTokenDelivery(walletAddress, tokens)
      
      if (!verification.delivered) {
        throw new Error('Token delivery verification failed')
      }
      
      console.log(`✅ Token delivery verified: ${verification.currentBalance} CHESS`)
      
    } catch (error) {
      console.warn('⚠️ Token delivery verification failed:', error.message)
      // Continue anyway since mint was successful
    }

    // Record successful purchase
    const purchaseRecord = {
      sessionId,
      walletAddress,
      amount,
      tokens,
      mintSignature: mintResult.signature,
      status: 'completed',
      demo: mintResult.demo || false,
      createdAt: new Date(),
      completedAt: new Date()
    }
    
    await db.collection('token_purchases').insertOne(purchaseRecord)

    // Update payment session as completed
    await db.collection('payment_sessions').updateOne(
      { sessionId },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          mintSignature: mintResult.signature
        } 
      }
    )

    // Update user balance in database (for caching/display)
    try {
      await db.collection('user_balances').updateOne(
        { walletAddress },
        { 
          $inc: { chessBalance: tokens },
          $set: { 
            lastUpdated: new Date(),
            lastPurchase: new Date(),
            lastSignature: mintResult.signature
          }
        },
        { upsert: true }
      )
      
      console.log(`📊 Updated user balance cache for ${walletAddress}`)
      
    } catch (error) {
      console.warn('⚠️ Failed to update balance cache:', error.message)
      // Continue anyway
    }

    console.log(`🎉 Payment completed successfully!`)
    console.log(`💰 Delivered ${tokens} CHESS tokens to ${walletAddress}`)

    return NextResponse.json({
      success: true,
      message: 'Payment completed and tokens delivered successfully',
      tokens,
      signature: mintResult.signature,
      transactionHash: mintResult.signature,
      walletAddress,
      demo: mintResult.demo || false,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Payment completion error:', error)
    
    // Try to update session status
    try {
      const db = await connectToDatabase()
      await db.collection('payment_sessions').updateOne(
        { sessionId: body.sessionId },
        { $set: { status: 'failed', error: error.message, failedAt: new Date() }}
      )
    } catch (dbError) {
      console.error('Failed to update payment session:', dbError)
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Payment processing failed: ' + error.message 
      }, 
      { status: 500 }
    )
  }
}