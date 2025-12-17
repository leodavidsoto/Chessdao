import { NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

/**
 * GET /api/squads
 * Get list of squads or specific squad
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const squadId = searchParams.get('id')
        const walletAddress = searchParams.get('wallet')
        const limit = parseInt(searchParams.get('limit') || '20')

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        if (squadId) {
            // Get specific squad
            const squad = await db.collection('squads').findOne({
                _id: new ObjectId(squadId)
            })

            if (!squad) {
                await client.close()
                return NextResponse.json({ error: 'Squad not found' }, { status: 404 })
            }

            // Get members
            const members = await db.collection('squad_members')
                .find({ squadId: squad._id.toString() })
                .sort({ rank: 1, score: -1 })
                .limit(50)
                .toArray()

            await client.close()
            return NextResponse.json({
                success: true,
                squad: {
                    ...squad,
                    members
                }
            })
        }

        // Get user's squad if wallet provided
        if (walletAddress) {
            const membership = await db.collection('squad_members').findOne({ walletAddress })

            if (membership) {
                const squad = await db.collection('squads').findOne({
                    _id: new ObjectId(membership.squadId)
                })

                await client.close()
                return NextResponse.json({
                    success: true,
                    mySquad: squad,
                    myMembership: membership
                })
            }
        }

        // Get leaderboard of top squads
        const squads = await db.collection('squads')
            .find({ status: 'active' })
            .sort({ totalScore: -1 })
            .limit(limit)
            .toArray()

        // Add rank
        const rankedSquads = squads.map((squad, index) => ({
            ...squad,
            rank: index + 1
        }))

        await client.close()
        return NextResponse.json({
            success: true,
            squads: rankedSquads,
            total: rankedSquads.length
        })

    } catch (error) {
        console.error('Squads GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/squads
 * Create a new squad or join existing
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { action, walletAddress, squadId, squadName, telegramChatId, description, avatar } = body

        if (!walletAddress) {
            return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const now = new Date()

        // Check if user already in a squad
        const existingMembership = await db.collection('squad_members').findOne({ walletAddress })

        if (action === 'create') {
            if (!squadName) {
                await client.close()
                return NextResponse.json({ error: 'squadName required' }, { status: 400 })
            }

            if (existingMembership) {
                await client.close()
                return NextResponse.json({
                    error: 'Ya eres miembro de un squad. Sal primero para crear uno nuevo.'
                }, { status: 400 })
            }

            // Create new squad
            const newSquad = {
                name: squadName,
                description: description || `Squad ${squadName}`,
                avatar: avatar || '🏆',
                telegramChatId: telegramChatId || null,
                creatorWallet: walletAddress,
                memberCount: 1,
                totalScore: 0,
                totalGames: 0,
                totalWins: 0,
                weeklyScore: 0,
                status: 'active',
                createdAt: now,
                updatedAt: now
            }

            const result = await db.collection('squads').insertOne(newSquad)

            // Add creator as admin member
            await db.collection('squad_members').insertOne({
                squadId: result.insertedId.toString(),
                walletAddress,
                role: 'admin',
                score: 0,
                gamesPlayed: 0,
                wins: 0,
                joinedAt: now
            })

            await client.close()

            return NextResponse.json({
                success: true,
                squadId: result.insertedId.toString(),
                message: `¡Squad "${squadName}" creado!`
            })
        }

        if (action === 'join') {
            if (!squadId) {
                await client.close()
                return NextResponse.json({ error: 'squadId required' }, { status: 400 })
            }

            if (existingMembership) {
                await client.close()
                return NextResponse.json({
                    error: 'Ya eres miembro de un squad. Sal primero para unirte a otro.'
                }, { status: 400 })
            }

            // Check squad exists
            const squad = await db.collection('squads').findOne({
                _id: new ObjectId(squadId),
                status: 'active'
            })

            if (!squad) {
                await client.close()
                return NextResponse.json({ error: 'Squad no encontrado' }, { status: 404 })
            }

            // Add member
            await db.collection('squad_members').insertOne({
                squadId,
                walletAddress,
                role: 'member',
                score: 0,
                gamesPlayed: 0,
                wins: 0,
                joinedAt: now
            })

            // Update squad member count
            await db.collection('squads').updateOne(
                { _id: new ObjectId(squadId) },
                {
                    $inc: { memberCount: 1 },
                    $set: { updatedAt: now }
                }
            )

            await client.close()

            return NextResponse.json({
                success: true,
                message: `¡Te uniste a "${squad.name}"!`
            })
        }

        if (action === 'leave') {
            if (!existingMembership) {
                await client.close()
                return NextResponse.json({ error: 'No eres miembro de ningún squad' }, { status: 400 })
            }

            // Remove member
            await db.collection('squad_members').deleteOne({ walletAddress })

            // Update squad member count
            await db.collection('squads').updateOne(
                { _id: new ObjectId(existingMembership.squadId) },
                {
                    $inc: { memberCount: -1 },
                    $set: { updatedAt: now }
                }
            )

            await client.close()

            return NextResponse.json({
                success: true,
                message: 'Has salido del squad'
            })
        }

        await client.close()
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Squads POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PUT /api/squads
 * Update squad score (called after games)
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { walletAddress, gameResult, gameType, pointsEarned } = body

        if (!walletAddress || pointsEarned === undefined) {
            return NextResponse.json({ error: 'walletAddress and pointsEarned required' }, { status: 400 })
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Find user's squad membership
        const membership = await db.collection('squad_members').findOne({ walletAddress })

        if (!membership) {
            await client.close()
            return NextResponse.json({
                success: false,
                message: 'Not in a squad'
            })
        }

        const isWin = gameResult === 'win'
        const now = new Date()

        // Update member stats
        await db.collection('squad_members').updateOne(
            { walletAddress },
            {
                $inc: {
                    score: pointsEarned,
                    gamesPlayed: 1,
                    wins: isWin ? 1 : 0
                }
            }
        )

        // Update squad stats
        await db.collection('squads').updateOne(
            { _id: new ObjectId(membership.squadId) },
            {
                $inc: {
                    totalScore: pointsEarned,
                    totalGames: 1,
                    totalWins: isWin ? 1 : 0,
                    weeklyScore: pointsEarned
                },
                $set: { updatedAt: now }
            }
        )

        await client.close()

        return NextResponse.json({
            success: true,
            squadId: membership.squadId,
            pointsAdded: pointsEarned
        })

    } catch (error) {
        console.error('Squad update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
