#!/usr/bin/env node

/**
 * Request SOL Airdrop for ChessDAO wallet
 */

const { Connection, clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')

async function requestAirdrop() {
    console.log('🪂 Requesting SOL Airdrop...')

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

    // Load wallet
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json')
    let walletAddress

    try {
        const keypairData = JSON.parse(fs.readFileSync(keypairPath))
        const { Keypair } = require('@solana/web3.js')
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData))
        walletAddress = keypair.publicKey.toString()
    } catch (e) {
        console.error('No wallet found')
        return
    }

    console.log(`💳 Wallet: ${walletAddress}`)

    // Check current balance
    const balanceBefore = await connection.getBalance(new PublicKey(walletAddress))
    console.log(`💰 Current balance: ${balanceBefore / LAMPORTS_PER_SOL} SOL`)

    if (balanceBefore >= 0.1 * LAMPORTS_PER_SOL) {
        console.log('✅ Already have enough SOL!')
        return
    }

    // Request airdrop
    try {
        console.log('📡 Requesting 2 SOL airdrop...')
        const signature = await connection.requestAirdrop(
            new PublicKey(walletAddress),
            2 * LAMPORTS_PER_SOL
        )

        console.log(`📝 Airdrop signature: ${signature}`)

        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...')
        await connection.confirmTransaction(signature, 'confirmed')

        // Check new balance
        const balanceAfter = await connection.getBalance(new PublicKey(walletAddress))
        console.log(`✅ New balance: ${balanceAfter / LAMPORTS_PER_SOL} SOL`)

    } catch (error) {
        console.log(`
⚠️  Airdrop failed: ${error.message}

The devnet faucet may be rate limited. Try these alternatives:

1. Web Faucet: https://faucet.solana.com
   Enter wallet: ${walletAddress}

2. Alternative Faucet: https://solfaucet.com
   Enter wallet: ${walletAddress}

After getting SOL, run: node scripts/deploy-token.js devnet
        `)
    }
}

requestAirdrop().catch(console.error)
