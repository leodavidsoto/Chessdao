import { NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

const TREASURY_WALLET = process.env.TREASURY_WALLET || '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
const RPC_URL = SOLANA_NETWORK === 'mainnet-beta'
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com'

// In-memory fallback storage
const getPaymentsStorage = () => {
  if (!global.paymentsStorage) {
    global.paymentsStorage = {
      transactions: [],
      processedSignatures: new Set()
    }
  }
  return global.paymentsStorage
}

// Try MongoDB, fallback to in-memory
async function getDb() {
  try {
    const { MongoClient } = await import('mongodb')
    const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
    await client.connect()
    return { db: client.db("dao_chess"), client, isMemory: false }
  } catch (error) {
    console.log('MongoDB unavailable, using in-memory storage for payments')
    return { db: null, client: null, isMemory: true }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { walletAddress, tokens, paymentMethod, paymentAmount, usdAmount, transactionSignature } = body

    console.log('Processing token credit request:', {
      walletAddress,
      tokens,
      paymentMethod,
      paymentAmount,
      transactionSignature
    })

    // Validate required fields
    if (!walletAddress || !tokens || !transactionSignature) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const { db, client, isMemory } = await getDb()

    // Check for duplicate transaction
    let alreadyProcessed = false
    if (isMemory) {
      const storage = getPaymentsStorage()
      alreadyProcessed = storage.processedSignatures.has(transactionSignature)
    } else {
      const existingTx = await db.collection('payment_transactions').findOne({ transactionSignature })
      alreadyProcessed = !!existingTx
    }

    if (alreadyProcessed) {
      if (client) await client.close()
      return NextResponse.json({
        success: false,
        error: 'Transaction already processed'
      }, { status: 400 })
    }

    // Validate transaction on Solana blockchain
    const connection = new Connection(RPC_URL, 'confirmed')
    let transactionVerified = false

    try {
      const tx = await connection.getTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0
      })

      if (!tx) {
        console.error('Transaction not found on blockchain')
        if (client) await client.close()
        return NextResponse.json({
          success: false,
          error: 'Transaction not found or not confirmed yet'
        }, { status: 400 })
      }

      // Verify the transaction went to our treasury wallet
      const treasuryKey = new PublicKey(TREASURY_WALLET)
      let foundTreasuryTransfer = false

      if (tx.transaction?.message?.accountKeys) {
        for (let i = 0; i < tx.transaction.message.accountKeys.length; i++) {
          const key = tx.transaction.message.accountKeys[i]
          if (key.equals(treasuryKey)) {
            foundTreasuryTransfer = true
            break
          }
        }
      }

      if (!foundTreasuryTransfer) {
        console.error('Transaction did not go to treasury wallet')
        if (client) await client.close()
        return NextResponse.json({
          success: false,
          error: 'Invalid transaction: payment did not go to treasury wallet'
        }, { status: 400 })
      }

      transactionVerified = true
      console.log('Transaction verified on blockchain')

    } catch (txError) {
      console.error('Error verifying transaction:', txError)
      // In devnet, allow continuation for testing
      if (SOLANA_NETWORK === 'devnet') {
        console.log('Continuing despite verification error (devnet mode)')
      } else {
        if (client) await client.close()
        return NextResponse.json({
          success: false,
          error: 'Failed to verify transaction on blockchain'
        }, { status: 400 })
      }
    }

    // Create transaction record
    const paymentTransaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletAddress,
      tokens: Number(tokens),
      paymentMethod,
      paymentAmount: Number(paymentAmount),
      usdAmount: Number(usdAmount),
      transactionSignature,
      verified: transactionVerified,
      network: SOLANA_NETWORK,
      status: 'completed',
      createdAt: new Date()
    }

    let newBalance = 0

    if (isMemory) {
      // In-memory storage
      const storage = getPaymentsStorage()
      storage.transactions.push(paymentTransaction)
      storage.processedSignatures.add(transactionSignature)

      // Update balance in global storage
      if (!global.balancesStorage) {
        global.balancesStorage = {}
      }
      if (!global.balancesStorage[walletAddress]) {
        global.balancesStorage[walletAddress] = {
          chessBalance: 0,
          gameBalance: 500,
          solBalance: 0,
          createdAt: new Date()
        }
      }
      global.balancesStorage[walletAddress].chessBalance += Number(tokens)
      global.balancesStorage[walletAddress].updatedAt = new Date()
      newBalance = global.balancesStorage[walletAddress].chessBalance

      console.log(`Credited ${tokens} CHESS tokens to ${walletAddress} (in-memory)`)
    } else {
      // MongoDB storage
      await db.collection('payment_transactions').insertOne(paymentTransaction)

      // Update user balance
      const balanceResult = await db.collection('balances').findOneAndUpdate(
        { walletAddress },
        {
          $inc: { chessBalance: Number(tokens) },
          $setOnInsert: {
            gameBalance: 500,
            solBalance: 0,
            createdAt: new Date()
          },
          $set: { updatedAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
      )

      newBalance = balanceResult.chessBalance || Number(tokens)

      // Also log to transactions collection for history
      await db.collection('transactions').insertOne({
        id: paymentTransaction.id,
        walletAddress,
        type: 'purchase',
        amount: Number(tokens),
        signature: transactionSignature,
        metadata: {
          paymentMethod,
          paymentAmount,
          usdAmount,
          network: SOLANA_NETWORK
        },
        status: 'completed',
        createdAt: new Date()
      })

      await client.close()
      console.log(`Credited ${tokens} CHESS tokens to ${walletAddress} (MongoDB)`)
    }

    return NextResponse.json({
      success: true,
      tokens: Number(tokens),
      newBalance,
      transaction: {
        id: paymentTransaction.id,
        signature: transactionSignature,
        verified: transactionVerified,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error processing token credit:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process token credit'
    }, { status: 500 })
  }
}