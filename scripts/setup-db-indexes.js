#!/usr/bin/env node

/**
 * ChessDAO Database Index Setup Script
 *
 * Run with: node scripts/setup-db-indexes.js
 *
 * This creates necessary indexes for production performance
 */

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'dao_chess'

async function setupIndexes() {
    const client = new MongoClient(MONGODB_URI)

    try {
        console.log('Connecting to MongoDB...')
        await client.connect()
        const db = client.db(DB_NAME)

        console.log('Creating indexes for production...\n')

        // Payment Transactions - Critical for token sales
        console.log('Setting up payment_transactions collection...')
        await db.collection('payment_transactions').createIndex(
            { transactionSignature: 1 },
            { unique: true, name: 'idx_tx_signature_unique' }
        )
        await db.collection('payment_transactions').createIndex(
            { walletAddress: 1 },
            { name: 'idx_wallet' }
        )
        await db.collection('payment_transactions').createIndex(
            { createdAt: -1 },
            { name: 'idx_created_desc' }
        )
        await db.collection('payment_transactions').createIndex(
            { status: 1, createdAt: -1 },
            { name: 'idx_status_date' }
        )

        // Balances - For user token balances
        console.log('Setting up balances collection...')
        await db.collection('balances').createIndex(
            { walletAddress: 1 },
            { unique: true, name: 'idx_wallet_unique' }
        )
        await db.collection('balances').createIndex(
            { chessBalance: -1 },
            { name: 'idx_balance_desc' }
        )

        // Transactions - For transaction history
        console.log('Setting up transactions collection...')
        await db.collection('transactions').createIndex(
            { walletAddress: 1, createdAt: -1 },
            { name: 'idx_wallet_date' }
        )
        await db.collection('transactions').createIndex(
            { type: 1, createdAt: -1 },
            { name: 'idx_type_date' }
        )
        await db.collection('transactions').createIndex(
            { signature: 1 },
            { unique: true, sparse: true, name: 'idx_signature_unique' }
        )

        // Players/Users
        console.log('Setting up players collection...')
        await db.collection('players').createIndex(
            { walletAddress: 1 },
            { unique: true, name: 'idx_wallet_unique' }
        )
        await db.collection('players').createIndex(
            { rating: -1 },
            { name: 'idx_rating_desc' }
        )
        await db.collection('players').createIndex(
            { username: 1 },
            { unique: true, sparse: true, name: 'idx_username_unique' }
        )

        // Games
        console.log('Setting up games collection...')
        await db.collection('games').createIndex(
            { status: 1, createdAt: -1 },
            { name: 'idx_status_date' }
        )
        await db.collection('games').createIndex(
            { 'players': 1 },
            { name: 'idx_players' }
        )
        await db.collection('games').createIndex(
            { creator: 1, status: 1 },
            { name: 'idx_creator_status' }
        )

        // User profiles
        console.log('Setting up users collection...')
        await db.collection('users').createIndex(
            { walletAddress: 1 },
            { unique: true, name: 'idx_wallet_unique' }
        )

        // Notifications
        console.log('Setting up notifications collection...')
        await db.collection('notifications').createIndex(
            { walletAddress: 1, read: 1, createdAt: -1 },
            { name: 'idx_wallet_read_date' }
        )

        // Friendships
        console.log('Setting up friendships collection...')
        await db.collection('friendships').createIndex(
            { walletAddress: 1, status: 1 },
            { name: 'idx_wallet_status' }
        )

        console.log('\nAll indexes created successfully!')

        // List all collections and their indexes
        console.log('\n--- Index Summary ---\n')
        const collections = await db.listCollections().toArray()
        for (const coll of collections) {
            const indexes = await db.collection(coll.name).indexes()
            console.log(`${coll.name}: ${indexes.length} indexes`)
            indexes.forEach(idx => {
                if (idx.name !== '_id_') {
                    console.log(`  - ${idx.name}`)
                }
            })
        }

    } catch (error) {
        console.error('Error setting up indexes:', error)
        process.exit(1)
    } finally {
        await client.close()
        console.log('\nDatabase connection closed.')
    }
}

setupIndexes()
