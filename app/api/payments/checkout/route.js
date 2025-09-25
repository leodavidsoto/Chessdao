import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { mintChessTokens } from '@/lib/solana'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

// Mock Stripe integration - In real implementation, use actual Stripe
const mockStripe = {
  async createCheckoutSession(data) {
    // Simulate Stripe checkout session creation
    const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: sessionId,
      url: `/api/payments/mock-checkout?session_id=${sessionId}&amount=${data.amount}&tokens=${data.tokens}&wallet=${data.walletAddress}`,
      amount_total: data.amount * 100, // Stripe uses cents
      currency: 'usd',
      metadata: data.metadata || {}
    }
  }
}

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db(DB_NAME)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      packageId, 
      packageName, 
      tokens, 
      price, 
      walletAddress,
      successUrl,
      cancelUrl 
    } = body

    // Validate input
    if (!packageId || !tokens || !price || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    if (tokens < 1 || price < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid token amount or price' }, 
        { status: 400 }
      )
    }

    // Create payment record
    const db = await connectToDatabase()
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const paymentRecord = {
      id: paymentId,
      packageId,
      packageName,
      tokens,
      price,
      walletAddress,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('payments').insertOne(paymentRecord)

    // Create checkout session (mock for demo)
    const session = await mockStripe.createCheckoutSession({
      amount: price,
      tokens,
      walletAddress,
      metadata: {
        paymentId,
        packageId,
        walletAddress
      }
    })

    // Store session info
    await db.collection('payment_sessions').insertOne({
      sessionId: session.id,
      paymentId: paymentId,
      amount: price,
      tokens,
      walletAddress,
      status: 'created',
      createdAt: new Date()
    })

    return NextResponse.json({
      success: true,
      paymentId,
      sessionId: session.id,
      checkoutUrl: session.url
    })

  } catch (error) {
    console.error('Payment checkout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' }, 
        { status: 400 }
      )
    }

    const db = await connectToDatabase()
    const session = await db.collection('payment_sessions').findOne({ sessionId })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' }, 
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.sessionId,
        status: session.status,
        amount: session.amount,
        tokens: session.tokens,
        walletAddress: session.walletAddress
      }
    })

  } catch (error) {
    console.error('Payment status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}