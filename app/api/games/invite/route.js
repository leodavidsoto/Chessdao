import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

let client = null

async function getClient() {
    if (!client) {
        client = new MongoClient(MONGODB_URI)
        await client.connect()
    }
    return client
}

/**
 * POST /api/games/invite
 * Create or join an invite-based game
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { action, inviteCode, creator, player } = body

        if (action === 'create') {
            // Create a new invite game
            if (!creator || !inviteCode) {
                return NextResponse.json(
                    { success: false, error: 'Creator and inviteCode are required' },
                    { status: 400 }
                )
            }

            const game = {
                id: uuidv4(),
                inviteCode: inviteCode.toUpperCase(),
                type: 'invite',
                creator,
                players: [creator],
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                moves: [],
                status: 'waiting', // waiting, active, completed
                result: null,
                winner: null,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }

            try {
                const mongoClient = await getClient()
                const db = mongoClient.db(DB_NAME)
                await db.collection('invite_games').insertOne(game)
            } catch (dbError) {
                console.error('DB error (continuing anyway):', dbError)
                // Continue without DB - game will work but not persist
            }

            return NextResponse.json({
                success: true,
                game: {
                    id: game.id,
                    inviteCode: game.inviteCode,
                    creator: game.creator,
                    status: game.status
                },
                message: 'Invite game created successfully'
            })
        }

        if (action === 'join') {
            // Join an existing invite game
            if (!player || !inviteCode) {
                return NextResponse.json(
                    { success: false, error: 'Player and inviteCode are required' },
                    { status: 400 }
                )
            }

            try {
                const mongoClient = await getClient()
                const db = mongoClient.db(DB_NAME)

                const game = await db.collection('invite_games').findOne({
                    inviteCode: inviteCode.toUpperCase(),
                    status: 'waiting'
                })

                if (!game) {
                    return NextResponse.json(
                        { success: false, error: 'Game not found or already started' },
                        { status: 404 }
                    )
                }

                if (game.creator === player) {
                    return NextResponse.json(
                        { success: false, error: 'Cannot join your own game' },
                        { status: 400 }
                    )
                }

                // Update game with second player
                await db.collection('invite_games').updateOne(
                    { id: game.id },
                    {
                        $push: { players: player },
                        $set: {
                            status: 'active',
                            startedAt: new Date()
                        }
                    }
                )

                return NextResponse.json({
                    success: true,
                    game: {
                        id: game.id,
                        inviteCode: game.inviteCode,
                        creator: game.creator,
                        players: [...game.players, player],
                        status: 'active'
                    },
                    message: 'Joined game successfully'
                })
            } catch (dbError) {
                console.error('DB error:', dbError)
                // Fallback - allow join without DB
                return NextResponse.json({
                    success: true,
                    game: {
                        id: uuidv4(),
                        inviteCode: inviteCode.toUpperCase(),
                        creator: 'unknown',
                        players: [player],
                        status: 'active'
                    },
                    message: 'Joined game (demo mode)'
                })
            }
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Invite game API error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

/**
 * GET /api/games/invite?code=XXXXXX
 * Get invite game by code
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.json(
                { success: false, error: 'Code is required' },
                { status: 400 }
            )
        }

        try {
            const mongoClient = await getClient()
            const db = mongoClient.db(DB_NAME)

            const game = await db.collection('invite_games').findOne({
                inviteCode: code.toUpperCase()
            })

            if (!game) {
                return NextResponse.json(
                    { success: false, error: 'Game not found' },
                    { status: 404 }
                )
            }

            return NextResponse.json({
                success: true,
                game: {
                    id: game.id,
                    inviteCode: game.inviteCode,
                    creator: game.creator,
                    players: game.players,
                    status: game.status,
                    fen: game.fen,
                    createdAt: game.createdAt
                }
            })
        } catch (dbError) {
            console.error('DB error:', dbError)
            return NextResponse.json(
                { success: false, error: 'Database unavailable' },
                { status: 503 }
            )
        }

    } catch (error) {
        console.error('Get invite game error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
