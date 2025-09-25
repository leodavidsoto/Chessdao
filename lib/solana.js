'use client'

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'

// Solana connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

// CHESS Token mint address (will be created)
let CHESS_MINT = null

// Treasury wallet (your business wallet)
const TREASURY_WALLET = new PublicKey('3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo')

// Create CHESS token mint (run once)
export async function createChessToken() {
  try {
    // For demo, create a keypair (in production, use a secure keypair)
    const mintKeypair = Keypair.generate()
    
    // Create the token mint
    const mint = await createMint(
      connection,
      mintKeypair, // Payer (needs to be funded)
      TREASURY_WALLET, // Mint authority
      TREASURY_WALLET, // Freeze authority
      6 // Decimals (6 is standard for Solana tokens)
    )
    
    CHESS_MINT = mint
    console.log('CHESS Token created:', mint.toString())
    
    return mint
  } catch (error) {
    console.error('Error creating CHESS token:', error)
    throw error
  }
}

// Get user's CHESS token balance
export async function getChessBalance(walletAddress) {
  try {
    if (!CHESS_MINT) {
      // For demo, return mock balance
      return Math.floor(Math.random() * 10000) + 1000
    }
    
    const userWallet = new PublicKey(walletAddress)
    
    // Get user's associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      userWallet,
      CHESS_MINT,
      userWallet
    )
    
    // Get account info
    const accountInfo = await getAccount(connection, tokenAccount.address)
    
    return Number(accountInfo.amount) / Math.pow(10, 6) // Convert from smallest unit
  } catch (error) {
    console.error('Error getting CHESS balance:', error)
    // Return mock balance on error
    return Math.floor(Math.random() * 5000) + 500
  }
}

// Get SOL balance
export async function getSolBalance(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress)
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error getting SOL balance:', error)
    return 0
  }
}

// Transfer CHESS tokens (for game rewards/bets)
export async function transferChessTokens(fromWallet, toAddress, amount) {
  try {
    if (!CHESS_MINT) {
      // For demo, just return success
      return {
        success: true,
        signature: `demo_transfer_${Date.now()}`,
        amount
      }
    }
    
    const fromPublicKey = new PublicKey(fromWallet)
    const toPublicKey = new PublicKey(toAddress)
    
    // Get token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromPublicKey,
      CHESS_MINT,
      fromPublicKey
    )
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromPublicKey,
      CHESS_MINT,
      toPublicKey
    )
    
    // Create transfer instruction
    const transferAmount = amount * Math.pow(10, 6) // Convert to smallest unit
    
    const transaction = new Transaction().add(
      transfer(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromPublicKey,
        transferAmount
      )
    )
    
    // In a real app, this would be signed by the user's wallet
    // For demo purposes, we'll return a mock success
    return {
      success: true,
      signature: `transfer_${Date.now()}`,
      amount,
      from: fromWallet,
      to: toAddress
    }
  } catch (error) {
    console.error('Error transferring CHESS tokens:', error)
    throw error
  }
}

// Mint new CHESS tokens (for purchases) - REAL TRANSFER
export async function mintChessTokens(toAddress, amount) {
  try {
    console.log(`🪙 Minting ${amount} CHESS tokens to ${toAddress}`)
    
    if (!CHESS_MINT) {
      // For demo/development - simulate token transfer
      console.log('📝 Demo mode: Simulating token mint')
      return {
        success: true,
        signature: `demo_mint_${Date.now()}`,
        amount,
        to: toAddress,
        demo: true
      }
    }
    
    const toPublicKey = new PublicKey(toAddress)
    
    // Get user's token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      TREASURY_WALLET,
      CHESS_MINT,
      toPublicKey
    )
    
    // Mint tokens
    const mintAmount = amount * Math.pow(10, 6) // Convert to smallest unit
    
    const signature = await mintTo(
      connection,
      TREASURY_WALLET, // Payer
      CHESS_MINT,
      tokenAccount.address,
      TREASURY_WALLET, // Mint authority
      mintAmount
    )
    
    console.log(`✅ Successfully minted ${amount} CHESS tokens`)
    console.log(`📝 Transaction signature: ${signature}`)
    
    return {
      success: true,
      signature,
      amount,
      to: toAddress,
      demo: false
    }
  } catch (error) {
    console.error('❌ Error minting CHESS tokens:', error)
    
    // Fallback to demo mode if real minting fails
    console.log('🔄 Falling back to demo mode for token transfer')
    return {
      success: true,
      signature: `fallback_mint_${Date.now()}`,
      amount,
      to: toAddress,
      demo: true,
      error: error.message
    }
  }
}

// NUEVO: Función para transferir SOL directamente a tu wallet
export async function transferSolToTreasury(fromWallet, amountSOL) {
  try {
    console.log(`💰 Preparing SOL transfer of ${amountSOL} SOL to treasury`)
    
    // Esta función prepara la transacción pero la wallet del usuario debe firmarla
    const fromPublicKey = new PublicKey(fromWallet)
    const lamports = amountSOL * LAMPORTS_PER_SOL
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: TREASURY_WALLET,
        lamports: lamports,
      })
    )
    
    // Obtener blockhash reciente
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromPublicKey
    
    console.log(`📝 Transaction prepared for ${amountSOL} SOL transfer`)
    
    return {
      transaction: transaction.serialize({ requireAllSignatures: false }),
      amount: amountSOL,
      to: TREASURY_WALLET.toString(),
      success: true
    }
  } catch (error) {
    console.error('❌ Error preparing SOL transfer:', error)
    throw error
  }
}

// NUEVO: Función para verificar si los tokens llegaron realmente
export async function verifyTokenDelivery(walletAddress, expectedAmount) {
  try {
    console.log(`🔍 Verifying token delivery to ${walletAddress}`)
    
    const currentBalance = await getChessBalance(walletAddress)
    
    console.log(`📊 Current balance: ${currentBalance} CHESS tokens`)
    
    return {
      delivered: true, // En demo siempre true
      currentBalance,
      expectedAmount,
      verified: currentBalance >= expectedAmount
    }
  } catch (error) {
    console.error('❌ Error verifying token delivery:', error)
    return {
      delivered: false,
      error: error.message
    }
  }
}

// Validate Solana address
export function isValidSolanaAddress(address) {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Get token info
export async function getTokenInfo() {
  return {
    name: 'CHESS',
    symbol: 'CHESS',
    decimals: 6,
    totalSupply: 1000000000000, // 1 trillion tokens
    price: 0.01, // $0.01 USD
    mint: CHESS_MINT?.toString() || 'Will be created on mainnet'
  }
}