#!/usr/bin/env node

/**
 * Add Metadata to CHESS Token using mpl-token-metadata
 * This requires the mint authority to sign
 */

const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')

// Token Configuration  
const CHESS_MINT = new PublicKey('B5WLyVEUc3wYMH1cn8bwVmRNRCg8JkJQyYjM1PLECDkt')
const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

const TOKEN_METADATA = {
    name: "CHESS",
    symbol: "CHESS",
    uri: "" // Empty for now, can add later
}

// Get Metadata PDA
function getMetadataPDA(mint) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            METAPLEX_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        METAPLEX_PROGRAM_ID
    )[0]
}

async function addMetadata() {
    console.log(`\n🏷️  Adding Metadata to CHESS Token\n`)
    console.log(`Token: ${CHESS_MINT.toString()}`)
    console.log(`Name: ${TOKEN_METADATA.name}`)
    console.log(`Symbol: ${TOKEN_METADATA.symbol}\n`)

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    console.log('📡 Connected to Solana Devnet')

    // The metadata needs to be created by the mint authority
    // Since we transferred authority to Phantom, we can't do it from server
    // The user needs to use a tool like Solana Token Creator or dApp

    const metadataPDA = getMetadataPDA(CHESS_MINT)
    console.log(`📋 Metadata PDA: ${metadataPDA.toString()}`)

    // Check if metadata exists
    const metadataAccount = await connection.getAccountInfo(metadataPDA)

    if (metadataAccount) {
        console.log(`\n✅ Metadata already exists!`)
    } else {
        console.log(`\n⚠️  No metadata found.`)
        console.log(`\nTo add metadata, you need to use a tool that can sign with your Phantom wallet.`)
        console.log(`\n📋 Options to add metadata:`)
        console.log(`   1. Use https://token-creator-lac.vercel.app/ (connects to your wallet)`)
        console.log(`   2. Use Metaboss CLI: metaboss create metadata`)
        console.log(`   3. Use the Solana SPL Token CLI with metadata extension`)
    }

    console.log(`\n🔗 Token Explorer: https://explorer.solana.com/address/${CHESS_MINT.toString()}?cluster=devnet`)
}

addMetadata().catch(console.error)
