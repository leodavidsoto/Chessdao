#!/usr/bin/env node

/**
 * ChessDAO Database Seeding Script
 * 
 * Run with: node scripts/seed-db.js
 * 
 * This creates initial data in MongoDB for testing:
 * - Sample players with ratings
 * - Sample games
 * - Sample transactions
 */

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'dao_chess'

async function seedDatabase() {
    const client = new MongoClient(MONGODB_URI)

    try {
        console.log('🔌 Connecting to MongoDB...')
        await client.connect()
        const db = client.db(DB_NAME)

        console.log('🗑️  Clearing existing data...')
        await db.collection('players').deleteMany({})
        await db.collection('games').deleteMany({})
        await db.collection('balances').deleteMany({})
        await db.collection('transactions').deleteMany({})

        // Seed Players
        console.log('👥 Seeding players...')
        const players = [
            {
                id: 'player_1',
                walletAddress: 'Demo1111111111111111111111111111111111111111',
                username: 'GrandMaster_Rex',
                rating: 2400,
                gamesPlayed: 150,
                gamesWon: 98,
                tokensEarned: 45000,
                createdAt: new Date()
            },
            {
                id: 'player_2',
                walletAddress: 'Demo2222222222222222222222222222222222222222',
                username: 'ChessQueen_99',
                rating: 2250,
                gamesPlayed: 120,
                gamesWon: 72,
                tokensEarned: 32000,
                createdAt: new Date()
            },
            {
                id: 'player_3',
                walletAddress: 'Demo3333333333333333333333333333333333333333',
                username: 'KnightRider',
                rating: 2100,
                gamesPlayed: 89,
                gamesWon: 45,
                tokensEarned: 18000,
                createdAt: new Date()
            },
            {
                id: 'player_4',
                walletAddress: 'Demo4444444444444444444444444444444444444444',
                username: 'BishopBlitz',
                rating: 1950,
                gamesPlayed: 67,
                gamesWon: 30,
                tokensEarned: 12000,
                createdAt: new Date()
            },
            {
                id: 'player_5',
                walletAddress: 'Demo5555555555555555555555555555555555555555',
                username: 'RookMaster',
                rating: 1800,
                gamesPlayed: 45,
                gamesWon: 18,
                tokensEarned: 8000,
                createdAt: new Date()
            }
        ]
        await db.collection('players').insertMany(players)

        // Seed Balances
        console.log('💰 Seeding balances...')
        const balances = players.map(p => ({
            walletAddress: p.walletAddress,
            chessBalance: p.tokensEarned,
            solBalance: Math.random() * 5,
            createdAt: new Date(),
            updatedAt: new Date()
        }))
        await db.collection('balances').insertMany(balances)

        // Seed Games
        console.log('🎮 Seeding games...')
        const games = [
            {
                id: 'game_1',
                type: 'pvp',
                title: 'High Stakes Battle',
                creator: players[0].walletAddress,
                bet: 500,
                timeControl: '5+3',
                active: false,
                status: 'completed',
                winner: players[0].walletAddress,
                players: [players[0].walletAddress, players[1].walletAddress],
                createdAt: new Date(Date.now() - 86400000),
                endedAt: new Date(Date.now() - 85000000)
            },
            {
                id: 'game_2',
                type: 'pvp',
                title: 'Quick Match',
                creator: players[2].walletAddress,
                bet: 100,
                timeControl: '3+2',
                active: true,
                status: 'waiting',
                players: [players[2].walletAddress],
                createdAt: new Date()
            },
            {
                id: 'game_3',
                type: 'community',
                title: 'DAO Community Game #42',
                creator: 'DAO',
                bet: 0,
                timeControl: '10+0',
                active: true,
                status: 'voting',
                players: [],
                createdAt: new Date()
            }
        ]
        await db.collection('games').insertMany(games)

        // Seed Transactions
        console.log('📝 Seeding transactions...')
        const transactions = [
            {
                walletAddress: players[0].walletAddress,
                type: 'purchase',
                amount: 10000,
                signature: 'purchase_seed_1',
                status: 'completed',
                createdAt: new Date(Date.now() - 172800000)
            },
            {
                walletAddress: players[0].walletAddress,
                type: 'win',
                amount: 500,
                signature: 'win_seed_1',
                metadata: { gameId: 'game_1', opponent: players[1].username },
                status: 'completed',
                createdAt: new Date(Date.now() - 85000000)
            },
            {
                walletAddress: players[1].walletAddress,
                type: 'purchase',
                amount: 5000,
                signature: 'purchase_seed_2',
                status: 'completed',
                createdAt: new Date(Date.now() - 259200000)
            }
        ]
        await db.collection('transactions').insertMany(transactions)

        // Create indexes
        console.log('📊 Creating indexes...')
        await db.collection('players').createIndex({ rating: -1 })
        await db.collection('players').createIndex({ walletAddress: 1 }, { unique: true })
        await db.collection('balances').createIndex({ walletAddress: 1 }, { unique: true })
        await db.collection('transactions').createIndex({ walletAddress: 1 })
        await db.collection('transactions').createIndex({ createdAt: -1 })
        await db.collection('games').createIndex({ status: 1 })
        await db.collection('games').createIndex({ createdAt: -1 })

        console.log('')
        console.log('✅ Database seeded successfully!')
        console.log('')
        console.log('📊 Summary:')
        console.log(`   - ${players.length} players`)
        console.log(`   - ${balances.length} balances`)
        console.log(`   - ${games.length} games`)
        console.log(`   - ${transactions.length} transactions`)
        console.log('')

    } catch (error) {
        console.error('❌ Seeding error:', error)
        process.exit(1)
    } finally {
        await client.close()
    }
}

seedDatabase()
