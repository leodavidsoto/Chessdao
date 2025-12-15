#!/usr/bin/env node

/**
 * Send CHESS tokens to your Phantom wallet
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js')
const { getOrCreateAssociatedTokenAccount, transfer, getAccount } = require('@solana/spl-token')
const fs = require('fs')
const path = require('path')

// Configuration
const CHESS_MINT = new PublicKey('B5WLyVEUc3wYMH1cn8bwVmRNRCg8JkJQyYjM1PLECDkt')
const TREASURY_TOKEN_ACCOUNT = new PublicKey('89Uw9syKyut4NYW9ZZszQxF5LErs2ahtsEtnhcBk9yFV')

async function sendTokens(recipientAddress, amount) {
    console.log(`\n🪙 Sending ${amount} CHESS tokens to ${recipientAddress}\n`)

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    console.log('📡 Connected to Solana Devnet')

    // Load payer keypair
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json')
    const keypairData = JSON.parse(fs.readFileSync(keypairPath))
    const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData))
    console.log(`💳 Payer: ${payer.publicKey.toString()}`)

    // Get or create recipient token account
    const recipient = new PublicKey(recipientAddress)
    console.log(`📮 Recipient: ${recipient.toString()}`)

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        CHESS_MINT,
        recipient
    )
    console.log(`📦 Recipient Token Account: ${recipientTokenAccount.address.toString()}`)

    // Get treasury token account (source)
    const treasuryAccountInfo = await getAccount(connection, TREASURY_TOKEN_ACCOUNT)
    console.log(`💰 Treasury Balance: ${Number(treasuryAccountInfo.amount) / 1e6} CHESS`)

    // Transfer tokens (amount in smallest units, 6 decimals)
    const transferAmount = amount * 1_000_000 // 6 decimals

    console.log(`\n🔄 Transferring ${amount} CHESS...`)

    const signature = await transfer(
        connection,
        payer,
        TREASURY_TOKEN_ACCOUNT,
        recipientTokenAccount.address,
        payer,
        transferAmount
    )

    console.log(`\n✅ SUCCESS!`)
    console.log(`📝 Signature: ${signature}`)
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

    // Verify recipient balance
    const recipientBalance = await getAccount(connection, recipientTokenAccount.address)
    console.log(`\n💎 Recipient Balance: ${Number(recipientBalance.amount) / 1e6} CHESS`)
}

// Get recipient from command line or use default Phantom wallet
const recipient = process.argv[2] || '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'
const amount = parseInt(process.argv[3]) || 1000

sendTokens(recipient, amount).catch(console.error)
