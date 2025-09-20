import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = "dao_chess"

let cachedClient = null

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient
  }
  
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  cachedClient = client
  return client
}

// GET requests
export async function GET(request, { params }) {
  try {
    const { path } = params || {}
    const pathname = path ? path.join('/') : ''
    
    // Root endpoint
    if (!pathname) {
      return NextResponse.json({ 
        message: "DAO Chess API is running!",
        timestamp: new Date().toISOString(),
        endpoints: [
          '/api/games',
          '/api/games/community',
          '/api/games/pvp',
          '/api/players',
          '/api/tokens/balance'
        ]
      })
    }

    const client = await connectToDatabase()
    const db = client.db(DB_NAME)

    switch (pathname) {
      case 'games':
        const games = await db.collection('games').find({}).limit(20).toArray()
        return NextResponse.json({ games })

      case 'games/community':
        const communityGames = await db.collection('games')
          .find({ type: 'community', active: true })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray()
        return NextResponse.json({ games: communityGames })

      case 'games/pvp':
        const pvpGames = await db.collection('games')
          .find({ type: 'pvp', status: 'waiting' })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray()
        return NextResponse.json({ games: pvpGames })

      case 'players':
        const players = await db.collection('players')
          .find({})
          .sort({ rating: -1 })
          .limit(50)
          .toArray()
        return NextResponse.json({ players })

      case 'tokens/balance':
        // Mock token balance - in real app would check blockchain
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')
        
        if (!walletAddress) {
          return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
        }

        // Mock balance data
        const balance = {
          walletAddress,
          chessTokens: Math.floor(Math.random() * 10000) + 500,
          solBalance: Math.random() * 5 + 0.5,
          timestamp: new Date().toISOString()
        }
        
        return NextResponse.json({ balance })

      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST requests
export async function POST(request, { params }) {
  try {
    const { path } = params || {}
    const pathname = path ? path.join('/') : ''
    const body = await request.json()
    
    const client = await connectToDatabase()
    const db = client.db(DB_NAME)

    switch (pathname) {
      case 'games/create':
        const newGame = {
          id: new Date().getTime().toString(),
          type: body.type || 'community',
          title: body.title || 'New Game',
          creator: body.creator,
          bet: body.bet || 0,
          timeControl: body.timeControl || '10+0',
          active: true,
          status: body.type === 'pvp' ? 'waiting' : 'voting',
          createdAt: new Date(),
          players: body.type === 'community' ? [] : [body.creator],
          moves: [],
          currentTurn: 'white'
        }
        
        const result = await db.collection('games').insertOne(newGame)
        return NextResponse.json({ game: newGame, success: true })

      case 'games/join':
        const { gameId, playerId } = body
        
        const updateResult = await db.collection('games').updateOne(
          { id: gameId },
          { 
            $addToSet: { players: playerId },
            $set: { status: 'active', updatedAt: new Date() }
          }
        )
        
        return NextResponse.json({ success: updateResult.modifiedCount > 0 })

      case 'games/vote':
        const { gameId: voteGameId, move, playerId: voter, tokens } = body
        
        const vote = {
          id: new Date().getTime().toString(),
          gameId: voteGameId,
          move,
          voter,
          tokens: tokens || 1,
          timestamp: new Date()
        }
        
        await db.collection('votes').insertOne(vote)
        return NextResponse.json({ vote, success: true })

      case 'games/move':
        const { gameId: moveGameId, move: gameMove, playerId: movePlayer } = body
        
        const moveRecord = {
          id: new Date().getTime().toString(),
          gameId: moveGameId,
          move: gameMove,
          player: movePlayer,
          timestamp: new Date()
        }
        
        await db.collection('moves').insertOne(moveRecord)
        
        // Update game state
        await db.collection('games').updateOne(
          { id: moveGameId },
          { 
            $push: { moves: moveRecord },
            $set: { 
              currentTurn: moveRecord.player === 'white' ? 'black' : 'white',
              updatedAt: new Date()
            }
          }
        )
        
        return NextResponse.json({ move: moveRecord, success: true })

      case 'players/register':
        const player = {
          id: new Date().getTime().toString(),
          walletAddress: body.walletAddress,
          username: body.username || `Player${Math.floor(Math.random() * 10000)}`,
          rating: 1200,
          gamesPlayed: 0,
          gamesWon: 0,
          tokensEarned: 0,
          createdAt: new Date()
        }
        
        await db.collection('players').insertOne(player)
        return NextResponse.json({ player, success: true })

      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT requests
export async function PUT(request, { params }) {
  try {
    const { path } = params || {}
    const pathname = path ? path.join('/') : ''
    const body = await request.json()
    
    const client = await connectToDatabase()
    const db = client.db(DB_NAME)

    switch (pathname) {
      case 'games/end':
        const { gameId, winner, reason } = body
        
        const endResult = await db.collection('games').updateOne(
          { id: gameId },
          { 
            $set: { 
              active: false,
              status: 'completed',
              winner,
              endReason: reason,
              endedAt: new Date()
            }
          }
        )
        
        return NextResponse.json({ success: endResult.modifiedCount > 0 })

      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// OPTIONS for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}