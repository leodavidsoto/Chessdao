import { NextResponse } from 'next/server'
import { getChessBalance, getSolBalance } from '@/lib/solana'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db(DB_NAME)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' }, 
        { status: 400 }
      )
    }

    console.log(`🔍 Getting real-time balance for wallet: ${walletAddress}`)

    // Get real balances from Solana network
    const [chessBalance, solBalance] = await Promise.all([
      getChessBalance(walletAddress),
      getSolBalance(walletAddress)
    ])

    console.log(`📊 Live balances - CHESS: ${chessBalance}, SOL: ${solBalance}`)

    // Get purchase history from database
    const db = await connectToDatabase()
    const purchases = await db.collection('token_purchases')
      .find({ walletAddress })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    // Get cached balance for comparison
    const cachedBalance = await db.collection('user_balances')
      .findOne({ walletAddress })

    const response = {
      success: true,
      walletAddress,
      realtime: {
        chessBalance,
        solBalance,
        timestamp: new Date().toISOString()
      },
      cached: cachedBalance ? {
        chessBalance: cachedBalance.chessBalance || 0,
        lastUpdated: cachedBalance.lastUpdated,
        lastPurchase: cachedBalance.lastPurchase
      } : null,
      recentPurchases: purchases.map(p => ({
        tokens: p.tokens,
        amount: p.amount,
        signature: p.mintSignature,
        date: p.createdAt,
        status: p.status
      })),
      stats: {
        totalPurchases: purchases.length,
        totalTokensPurchased: purchases.reduce((sum, p) => sum + (p.tokens || 0), 0),
        totalSpent: purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Balance check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get wallet balance: ' + error.message 
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { walletAddress, action } = body

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' }, 
        { status: 400 }
      )
    }

    const db = await connectToDatabase()

    if (action === 'refresh') {
      // Force refresh the cached balance
      const [chessBalance, solBalance] = await Promise.all([
        getChessBalance(walletAddress),
        getSolBalance(walletAddress)
      ])

      await db.collection('user_balances').updateOne(
        { walletAddress },
        {
          $set: {
            chessBalance,
            solBalance,
            lastUpdated: new Date(),
            forceRefreshed: true
          }
        },
        { upsert: true }
      )

      console.log(`🔄 Force refreshed balance for ${walletAddress}: ${chessBalance} CHESS`)

      return NextResponse.json({
        success: true,
        message: 'Balance refreshed successfully',
        chessBalance,
        solBalance,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' }, 
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ Balance action error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform balance action: ' + error.message 
      }, 
      { status: 500 }
    )
  }
}