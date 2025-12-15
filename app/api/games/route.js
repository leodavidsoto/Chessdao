import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

let cachedClient = null

async function getClient() {
    if (cachedClient) return cachedClient
    cachedClient = new MongoClient(MONGODB_URI)
    await cachedClient.connect()
    return cachedClient
}

// GET /api/games - List games
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // active, completed, waiting
        const player = searchParams.get('player') // wallet address
        const type = searchParams.get('type') // pvp, ai, dao
        const limit = parseInt(searchParams.get('limit') || '20')

        const client = await getClient()
        const db = client.db(DB_NAME)

        // Build query
        const query = {}
        if (status) query.status = status
        if (player) query.players = player
        if (type) query.type = type

        const games = await db.collection('games')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray()

        return NextResponse.json({
            games,
            total: games.length
        })
    } catch (error) {
        console.error('Games API GET error:', error)

        // Return demo data if MongoDB unavailable
        return NextResponse.json({
            games: [
                {
                    id: 'demo_game_1',
                    type: 'dao',
                    title: 'DAO Community Game #1',
                    status: 'active',
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                    votes: { e4: 5, d4: 3, Nf3: 2 },
                    players: [],
                    createdAt: new Date()
                }
            ],
            demo: true,
            total: 1
        })
    }
}

// POST /api/games - Create/save a game
export async function POST(request) {
    try {
        const body = await request.json()
        const {
            type = 'ai',
            title,
            creator,
            players = [],
            fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            moves = [],
            bet = 0,
            timeControl = '10+0',
            difficulty = 'medium'
        } = body

        const client = await getClient()
        const db = client.db(DB_NAME)

        const gameDoc = {
            id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title: title || `${type.toUpperCase()} Game`,
            status: 'active',
            creator,
            players,
            fen,
            moves,
            bet,
            timeControl,
            difficulty,
            votes: type === 'dao' ? {} : undefined,
            result: null,
            winner: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        await db.collection('games').insertOne(gameDoc)

        return NextResponse.json({
            success: true,
            game: gameDoc
        })
    } catch (error) {
        console.error('Games API POST error:', error)
        return NextResponse.json(
            { error: 'Failed to create game', details: error.message },
            { status: 500 }
        )
    }
}

// PUT /api/games - Update game state
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, fen, moves, status, result, winner, votes } = body

        if (!id) {
            return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
        }

        const client = await getClient()
        const db = client.db(DB_NAME)

        const updateDoc = { updatedAt: new Date() }
        if (fen) updateDoc.fen = fen
        if (moves) updateDoc.moves = moves
        if (status) updateDoc.status = status
        if (result) updateDoc.result = result
        if (winner !== undefined) updateDoc.winner = winner
        if (votes) updateDoc.votes = votes

        const updateResult = await db.collection('games').updateOne(
            { id },
            { $set: updateDoc }
        )

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 })
        }

        const updatedGame = await db.collection('games').findOne({ id })

        return NextResponse.json({
            success: true,
            game: updatedGame
        })
    } catch (error) {
        console.error('Games API PUT error:', error)
        return NextResponse.json(
            { error: 'Failed to update game', details: error.message },
            { status: 500 }
        )
    }
}
