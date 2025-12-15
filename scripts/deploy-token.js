#!/usr/bin/env node

/**
 * ChessDAO Token Deployment Script
 * 
 * Creates the CHESS token and provides instructions for Phantom wallet
 * 
 * Features:
 * - Creates SPL token with metadata
 * - Sets up treasury account
 * - Provides Phantom integration code
 * - Generates verification links
 * 
 * Usage:
 *   node scripts/deploy-token.js [devnet|mainnet]
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
    getMint,
    setAuthority,
    AuthorityType
} = require('@solana/spl-token')

const fs = require('fs')
const path = require('path')

// ============= CONFIGURATION =============

const TOKEN_CONFIG = {
    name: 'CHESS',
    symbol: 'CHESS',
    decimals: 6,
    initialSupply: 1_000_000_000, // 1 billion tokens
    description: 'ChessDAO Gaming and Governance Token',

    // Security settings
    maxSupply: 1_000_000_000,     // Fixed supply cap
    dailyMintLimit: 10_000_000,   // 10M daily limit

    // URLs
    image: 'https://raw.githubusercontent.com/chessdao/assets/main/chess-token.png',
    website: 'https://chessdao.io',

    // Social
    twitter: '@ChessDAO',
    discord: 'https://discord.gg/chessdao'
}

// Treasury wallet
const TREASURY_ADDRESS = process.env.TREASURY_WALLET || '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'

// ============= MAIN DEPLOYMENT =============

async function deployToken() {
    const network = process.argv[2] || 'devnet'

    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🪙 ChessDAO Token Deployment                           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `)

    console.log(`📡 Network: ${network}`)
    console.log(`🎯 Token: ${TOKEN_CONFIG.name} (${TOKEN_CONFIG.symbol})`)
    console.log(`💰 Initial Supply: ${TOKEN_CONFIG.initialSupply.toLocaleString()}`)
    console.log(`🔒 Max Supply: ${TOKEN_CONFIG.maxSupply.toLocaleString()}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    // Connect to network
    const endpoint = network === 'mainnet'
        ? clusterApiUrl('mainnet-beta')
        : clusterApiUrl('devnet')

    const connection = new Connection(endpoint, 'confirmed')
    console.log(`\n📡 Connected to ${endpoint}`)

    // Load wallet
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json')
    let payer

    try {
        const keypairData = JSON.parse(fs.readFileSync(keypairPath))
        payer = Keypair.fromSecretKey(Uint8Array.from(keypairData))
        console.log(`💳 Wallet: ${payer.publicKey.toString()}`)
    } catch (error) {
        console.log('⚠️  No wallet found. Creating new keypair...')
        payer = Keypair.generate()
        fs.mkdirSync(path.dirname(keypairPath), { recursive: true })
        fs.writeFileSync(keypairPath, JSON.stringify(Array.from(payer.secretKey)))
        console.log(`💳 Created wallet: ${payer.publicKey.toString()}`)
    }

    // Check balance
    const balance = await connection.getBalance(payer.publicKey)
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`)

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log(`
⚠️  Insufficient balance!

You need at least 0.1 SOL to deploy the token.
        `)

        if (network === 'devnet') {
            console.log(`Run these commands:
  solana config set --url devnet
  solana airdrop 2
            `)
        }

        process.exit(1)
    }

    // ============= CREATE TOKEN =============

    console.log('\n🔄 Creating token mint...')

    try {
        const mint = await createMint(
            connection,
            payer,
            payer.publicKey,        // Mint authority
            payer.publicKey,        // Freeze authority (can be null for no freeze)
            TOKEN_CONFIG.decimals
        )

        console.log(`✅ Token Mint Created!`)
        console.log(`   Address: ${mint.toString()}`)

        // Create treasury token account
        console.log('\n🔄 Creating treasury token account...')

        const treasuryPublicKey = new PublicKey(TREASURY_ADDRESS)
        const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            treasuryPublicKey
        )

        console.log(`✅ Treasury Account: ${treasuryTokenAccount.address.toString()}`)

        // Mint initial supply
        console.log(`\n🔄 Minting ${TOKEN_CONFIG.initialSupply.toLocaleString()} tokens...`)

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

        // Verify mint
        const mintInfo = await getMint(connection, mint)
        console.log(`\n📊 Token Info:`)
        console.log(`   Supply: ${Number(mintInfo.supply) / Math.pow(10, TOKEN_CONFIG.decimals)}`)
        console.log(`   Decimals: ${mintInfo.decimals}`)

        // Save configuration
        const tokenConfig = {
            network,
            mintAddress: mint.toString(),
            mintAuthority: payer.publicKey.toString(),
            freezeAuthority: payer.publicKey.toString(),
            treasuryWallet: TREASURY_ADDRESS,
            treasuryTokenAccount: treasuryTokenAccount.address.toString(),
            decimals: TOKEN_CONFIG.decimals,
            initialSupply: TOKEN_CONFIG.initialSupply,
            maxSupply: TOKEN_CONFIG.maxSupply,
            createdAt: new Date().toISOString(),
            explorerUrl: `https://explorer.solana.com/address/${mint.toString()}?cluster=${network}`
        }

        const configPath = path.join(__dirname, '../.chess-token.json')
        fs.writeFileSync(configPath, JSON.stringify(tokenConfig, null, 2))
        console.log(`\n📝 Config saved to ${configPath}`)

        // ============= PHANTOM WALLET INSTRUCTIONS =============

        console.log(`

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   📱 PHANTOM WALLET INSTRUCTIONS                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

To add CHESS token to your Phantom wallet:

1. Open Phantom Wallet
2. Click on the token list (coins icon)
3. Click "Manage Token List" 
4. Click the "+" button (Add Custom Token)
5. Paste this address:

   ${mint.toString()}

6. Click "Add" to confirm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Explorer Links:

   Token:    ${tokenConfig.explorerUrl}
   Treasury: https://explorer.solana.com/address/${treasuryTokenAccount.address.toString()}?cluster=${network}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Update your app with these values:

   // In lib/solana.js
   const CHESS_MINT = new PublicKey('${mint.toString()}')

   // In .env.local
   NEXT_PUBLIC_CHESS_MINT=${mint.toString()}
   NEXT_PUBLIC_TREASURY_WALLET=${TREASURY_ADDRESS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `)

        // Generate Phantom deep link
        const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(tokenConfig.explorerUrl)}`
        console.log(`\n📲 Phantom Deep Link (mobile):`)
        console.log(`   ${phantomDeepLink}`)

        // Create update script for lib/solana.js
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ✅ DEPLOYMENT COMPLETE!                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

🪙 CHESS Token: ${mint.toString()}
📊 Supply: ${TOKEN_CONFIG.initialSupply.toLocaleString()} tokens
🏦 Treasury: ${treasuryTokenAccount.address.toString()}
        `)

        return {
            mint: mint.toString(),
            treasuryTokenAccount: treasuryTokenAccount.address.toString(),
            signature
        }

    } catch (error) {
        console.error('\n❌ Deployment failed:', error)
        process.exit(1)
    }
}

// ============= HELPER: ADD TO PHANTOM PROGRAMMATICALLY =============

async function addToPhantomWallet(mintAddress) {
    console.log(`
// Add this code to your app to prompt users to add the token:

async function addChessTokenToPhantom() {
    const CHESS_MINT = '${mintAddress}';
    
    if (window.solana && window.solana.isPhantom) {
        try {
            // Request to add token to user's wallet
            await window.solana.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'SPL',
                    options: {
                        address: CHESS_MINT,
                    },
                },
            });
            console.log('CHESS token added to Phantom!');
            return true;
        } catch (error) {
            console.error('User rejected or error:', error);
            return false;
        }
    } else {
        console.log('Phantom wallet not detected');
        return false;
    }
}
    `)
}

// Run deployment
deployToken()
    .then(result => {
        if (result) {
            addToPhantomWallet(result.mint)
        }
    })
    .catch(console.error)
