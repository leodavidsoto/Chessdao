#!/usr/bin/env node

/**
 * ChessDAO SPL Token Creator
 * 
 * Creates the CHESS token on Solana devnet/mainnet
 * 
 * Usage:
 *   node scripts/create-spl-token.js [devnet|mainnet]
 * 
 * Prerequisites:
 *   1. Install Solana CLI: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
 *   2. Create wallet: solana-keygen new
 *   3. Get devnet SOL: solana airdrop 2 (for devnet)
 */

const {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl,
    LAMPORTS_PER_SOL
} = require('@solana/web3.js')

const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
    getMint
} = require('@solana/spl-token')

const fs = require('fs')
const path = require('path')

// Configuration
const TOKEN_CONFIG = {
    name: 'CHESS',
    symbol: 'CHESS',
    decimals: 6,
    initialSupply: 1_000_000_000, // 1 billion tokens
    description: 'ChessDAO Governance and Gaming Token',
    image: 'https://raw.githubusercontent.com/chessdao/assets/main/chess-token.png'
}

// Treasury wallet (receives payments)
const TREASURY_ADDRESS = '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'

async function main() {
    const network = process.argv[2] || 'devnet'
    console.log(`\n🪙 ChessDAO SPL Token Creator`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Network: ${network}`)
    console.log(`Token: ${TOKEN_CONFIG.name} (${TOKEN_CONFIG.symbol})`)
    console.log(`Decimals: ${TOKEN_CONFIG.decimals}`)
    console.log(`Initial Supply: ${TOKEN_CONFIG.initialSupply.toLocaleString()}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    // Connect to network
    const endpoint = network === 'mainnet'
        ? clusterApiUrl('mainnet-beta')
        : clusterApiUrl('devnet')

    const connection = new Connection(endpoint, 'confirmed')
    console.log(`📡 Connected to ${endpoint}`)

    // Load or create keypair
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json')
    let payer

    try {
        const keypairData = JSON.parse(fs.readFileSync(keypairPath))
        payer = Keypair.fromSecretKey(Uint8Array.from(keypairData))
        console.log(`💳 Loaded wallet: ${payer.publicKey.toString()}`)
    } catch (error) {
        console.log('⚠️  No wallet found. Creating new keypair...')
        payer = Keypair.generate()

        // Save keypair
        fs.mkdirSync(path.dirname(keypairPath), { recursive: true })
        fs.writeFileSync(keypairPath, JSON.stringify(Array.from(payer.secretKey)))
        console.log(`💳 Created new wallet: ${payer.publicKey.toString()}`)
        console.log(`📝 Saved to ${keypairPath}`)
    }

    // Check balance
    const balance = await connection.getBalance(payer.publicKey)
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`)

    if (balance < 0.05 * LAMPORTS_PER_SOL) {
        console.log('\n⚠️  Insufficient balance!')
        console.log('   You need at least 0.05 SOL to create the token.')

        if (network === 'devnet') {
            console.log('\n   Run: solana airdrop 2')
            console.log('   Or visit: https://faucet.solana.com')
        } else {
            console.log('   Please fund your wallet with SOL.')
        }

        process.exit(1)
    }

    // Create token mint
    console.log('\n🔄 Creating token mint...')

    try {
        const mint = await createMint(
            connection,
            payer,
            payer.publicKey,        // Mint authority
            payer.publicKey,        // Freeze authority (optional)
            TOKEN_CONFIG.decimals
        )

        console.log(`✅ Token Mint Created: ${mint.toString()}`)

        // Save mint address
        const mintConfig = {
            network,
            mintAddress: mint.toString(),
            mintAuthority: payer.publicKey.toString(),
            decimals: TOKEN_CONFIG.decimals,
            createdAt: new Date().toISOString(),
            explorerUrl: `https://explorer.solana.com/address/${mint.toString()}?cluster=${network}`
        }

        const configPath = path.join(__dirname, '../.chess-token.json')
        fs.writeFileSync(configPath, JSON.stringify(mintConfig, null, 2))
        console.log(`📝 Config saved to ${configPath}`)

        // Create token account for treasury
        console.log('\n🔄 Creating treasury token account...')

        const treasuryPublicKey = new PublicKey(TREASURY_ADDRESS)
        const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            treasuryPublicKey
        )

        console.log(`✅ Treasury Token Account: ${treasuryTokenAccount.address.toString()}`)

        // Mint initial supply to treasury
        console.log(`\n🔄 Minting ${TOKEN_CONFIG.initialSupply.toLocaleString()} tokens to treasury...`)

        const mintAmount = TOKEN_CONFIG.initialSupply * Math.pow(10, TOKEN_CONFIG.decimals)

        const signature = await mintTo(
            connection,
            payer,
            mint,
            treasuryTokenAccount.address,
            payer,
            mintAmount
        )

        console.log(`✅ Minted! Signature: ${signature}`)

        // Verify mint info
        const mintInfo = await getMint(connection, mint)
        console.log(`\n📊 Mint Info:`)
        console.log(`   Supply: ${Number(mintInfo.supply) / Math.pow(10, TOKEN_CONFIG.decimals)}`)
        console.log(`   Decimals: ${mintInfo.decimals}`)

        // Summary
        console.log(`\n${'━'.repeat(50)}`)
        console.log(`🎉 SUCCESS! CHESS Token Created!`)
        console.log(`${'━'.repeat(50)}`)
        console.log(`\nMint Address: ${mint.toString()}`)
        console.log(`Treasury Account: ${treasuryTokenAccount.address.toString()}`)
        console.log(`\nExplorer: ${mintConfig.explorerUrl}`)
        console.log(`\n📋 Next Steps:`)
        console.log(`   1. Update lib/solana.js with the mint address`)
        console.log(`   2. Test token transfers`)
        console.log(`   3. Create token metadata (optional)`)

        // Create update script
        console.log(`\n📝 To update your app, add this to lib/solana.js:`)
        console.log(`   const CHESS_MINT = new PublicKey('${mint.toString()}')`)

    } catch (error) {
        console.error('\n❌ Error creating token:', error)
        process.exit(1)
    }
}

main().catch(console.error)
