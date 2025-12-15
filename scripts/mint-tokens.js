#!/usr/bin/env node

/**
 * Mint CHESS tokens directly to a wallet (using mint authority)
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js')
const { getOrCreateAssociatedTokenAccount, mintTo, getAccount, getMint } = require('@solana/spl-token')
const fs = require('fs')
const path = require('path')

// Configuration
const CHESS_MINT = new PublicKey('B5WLyVEUc3wYMH1cn8bwVmRNRCg8JkJQyYjM1PLECDkt')

async function mintTokens(recipientAddress, amount) {
    console.log(`\n🪙 Minting ${amount} CHESS tokens to ${recipientAddress}\n`)

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    console.log('📡 Connected to Solana Devnet')

    // Load mint authority keypair
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json')
    const keypairData = JSON.parse(fs.readFileSync(keypairPath))
    const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(keypairData))
    console.log(`💳 Mint Authority: ${mintAuthority.publicKey.toString()}`)

    // Verify mint authority
    const mintInfo = await getMint(connection, CHESS_MINT)
    console.log(`🔑 Token Mint Authority: ${mintInfo.mintAuthority.toString()}`)

    if (mintInfo.mintAuthority.toString() !== mintAuthority.publicKey.toString()) {
        throw new Error('Current wallet is not the mint authority!')
    }

    // Get or create recipient token account
    const recipient = new PublicKey(recipientAddress)
    console.log(`📮 Recipient: ${recipient.toString()}`)

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        mintAuthority,
        CHESS_MINT,
        recipient
    )
    console.log(`📦 Recipient Token Account: ${recipientTokenAccount.address.toString()}`)

    // Mint tokens (amount in smallest units, 6 decimals)
    const mintAmount = BigInt(amount * 1_000_000) // 6 decimals

    console.log(`\n🔄 Minting ${amount} CHESS...`)

    const signature = await mintTo(
        connection,
        mintAuthority,
        CHESS_MINT,
        recipientTokenAccount.address,
        mintAuthority,
        mintAmount
    )

    console.log(`\n✅ SUCCESS!`)
    console.log(`📝 Signature: ${signature}`)
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

    // Verify recipient balance
    const recipientBalance = await getAccount(connection, recipientTokenAccount.address)
    console.log(`\n💎 Recipient Balance: ${Number(recipientBalance.amount) / 1e6} CHESS`)

    return signature
}

// Get recipient from command line
const recipient = process.argv[2]
const amount = parseInt(process.argv[3]) || 1000

if (!recipient) {
    console.log('Usage: node scripts/mint-tokens.js <recipient_wallet_address> [amount]')
    console.log('Example: node scripts/mint-tokens.js 3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo 1000')
    process.exit(1)
}

mintTokens(recipient, amount).catch(console.error)
