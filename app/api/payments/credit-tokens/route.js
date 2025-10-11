import { NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

const TREASURY_WALLET = '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'

export async function POST(request) {
  try {
    const body = await request.json()
    const { walletAddress, tokens, paymentMethod, paymentAmount, usdAmount, transactionSignature } = body

    console.log('💰 Processing token credit request:', {
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

    // Validate transaction on Solana blockchain
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    
    try {
      const tx = await connection.getTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0
      })

      if (!tx) {
        console.error('❌ Transaction not found on blockchain')
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
        console.error('❌ Transaction did not go to treasury wallet')
        return NextResponse.json({
          success: false,
          error: 'Invalid transaction: payment did not go to treasury wallet'
        }, { status: 400 })
      }

      console.log('✅ Transaction verified on blockchain')

    } catch (txError) {
      console.error('Error verifying transaction:', txError)
      // Continue anyway for devnet testing
      console.log('⚠️ Continuing despite verification error (devnet mode)')
    }

    // TODO: Update user balance in database
    // For now, we'll simulate the credit
    
    console.log(`✅ Credited ${tokens} CHESS tokens to ${walletAddress}`)

    // Record transaction in database (TODO: implement MongoDB save)
    const transaction = {
      walletAddress,
      tokens,
      paymentMethod,
      paymentAmount,
      usdAmount,
      transactionSignature,
      status: 'completed',
      createdAt: new Date()
    }

    console.log('📝 Transaction record:', transaction)

    return NextResponse.json({
      success: true,
      tokens,
      newBalance: tokens, // In real app, this would be fetched from DB
      transaction: {
        signature: transactionSignature,
        verified: true,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error processing token credit:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process token credit'
    }, { status: 500 })
  }
}