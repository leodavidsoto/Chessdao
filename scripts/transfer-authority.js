#!/usr/bin/env node

/**
 * Transfer Mint Authority to another wallet
 * This script transfers the mint authority of the CHESS token
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js')
const { setAuthority, AuthorityType, getMint } = require('@solana/spl-token')
const fs = require('fs')
const path = require('path')

// Configuration
const CHESS_MINT = new PublicKey('B5WLyVEUc3wYMH1cn8bwVmRNRCg8JkJQyYjM1PLECDkt')

async function transferAuthority(newAuthorityAddress) {
    console.log(`\n🔐 Transferring Mint Authority\n`)
    console.log(`Token: ${CHESS_MINT.toString()}`)
    console.log(`New Authority: ${newAuthorityAddress}\n`)

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    console.log('📡 Connected to Solana Devnet')

    // Load current authority keypair
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json')
    const keypairData = JSON.parse(fs.readFileSync(keypairPath))
    const currentAuthority = Keypair.fromSecretKey(Uint8Array.from(keypairData))
    console.log(`💳 Current Authority: ${currentAuthority.publicKey.toString()}`)

    // Verify current authority
    const mintInfo = await getMint(connection, CHESS_MINT)
    console.log(`🔑 Token Mint Authority: ${mintInfo.mintAuthority?.toString() || 'None'}`)

    if (!mintInfo.mintAuthority || mintInfo.mintAuthority.toString() !== currentAuthority.publicKey.toString()) {
        throw new Error('Current wallet is not the mint authority!')
    }

    const newAuthority = new PublicKey(newAuthorityAddress)

    // Transfer Mint Authority
    console.log(`\n🔄 Transferring Mint Authority...`)

    const signature = await setAuthority(
        connection,
        currentAuthority,           // Payer
        CHESS_MINT,                 // Mint
        currentAuthority.publicKey, // Current authority
        AuthorityType.MintTokens,   // Authority type
        newAuthority                // New authority
    )

    console.log(`\n✅ SUCCESS!`)
    console.log(`📝 Signature: ${signature}`)
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

    // Verify new authority
    const updatedMint = await getMint(connection, CHESS_MINT)
    console.log(`\n🔑 New Mint Authority: ${updatedMint.mintAuthority?.toString()}`)

    if (updatedMint.mintAuthority?.toString() === newAuthorityAddress) {
        console.log(`\n✅ Authority successfully transferred to ${newAuthorityAddress}`)
    }
}

// Get new authority from command line
const newAuthority = process.argv[2]

if (!newAuthority) {
    console.log('Usage: node scripts/transfer-authority.js <new_authority_wallet_address>')
    console.log('Example: node scripts/transfer-authority.js 3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo')
    process.exit(1)
}

transferAuthority(newAuthority).catch(console.error)
