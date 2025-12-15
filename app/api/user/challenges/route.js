import { NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

/**
 * GET /api/user/challenges?wallet=xxx
 * Get challenges for a user
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')
        const status = searchParams.get('status') // pending, accepted, completed, all

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Build query
        const query = {
            $or: [
                { challenger: walletAddress },
                { challenged: walletAddress }
            ]
        }

        if (status && status !== 'all') {
            query.status = status
        }

        // Get challenges
        const challenges = await db.collection('challenges')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray()

        // Get user profiles for challengers
        const wallets = new Set()
        challenges.forEach(c => {
            wallets.add(c.challenger)
            wallets.add(c.challenged)
        })

        const users = await db.collection('users').find({
            walletAddress: { $in: Array.from(wallets) }
        }).toArray()

        const userMap = {}
        users.forEach(u => {
            userMap[u.walletAddress] = {
                username: u.username,
                avatar: u.avatar,
                rating: u.rating || 1200
            }
        })

        // Separate incoming and outgoing
        const incoming = challenges
            .filter(c => c.challenged === walletAddress && c.status === 'pending')
            .map(c => ({
                ...c,
                _id: c._id.toString(),
                challengerInfo: userMap[c.challenger] || { username: 'Unknown' }
            }))

        const outgoing = challenges
            .filter(c => c.challenger === walletAddress && c.status === 'pending')
            .map(c => ({
                ...c,
                _id: c._id.toString(),
                challengedInfo: userMap[c.challenged] || { username: 'Unknown' }
            }))

        const completed = challenges
            .filter(c => c.status === 'completed')
            .map(c => ({
                ...c,
                _id: c._id.toString(),
                challengerInfo: userMap[c.challenger] || { username: 'Unknown' },
                challengedInfo: userMap[c.challenged] || { username: 'Unknown' }
            }))

        await client.close()

        return NextResponse.json({
            walletAddress,
            incoming,
            outgoing,
            completed: completed.slice(0, 10),
            counts: {
                incomingPending: incoming.length,
                outgoingPending: outgoing.length,
                totalCompleted: completed.length
            }
        })

    } catch (error) {
        console.error('Challenges API error:', error)
        return NextResponse.json(
            { error: 'Failed to get challenges', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/user/challenges
 * Send a challenge to another user
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const {
            challenger,
            challenged,
            gameType = 'pvp',
            timeControl = '10+0',
            betAmount = 0,
            color = 'random',
            message = ''
        } = body

        if (!challenger || !challenged) {
            return NextResponse.json(
                { error: 'challenger and challenged are required' },
                { status: 400 }
            )
        }

        if (challenger === challenged) {
            return NextResponse.json(
                { error: 'Cannot challenge yourself' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Check if challenged user exists and accepts challenges
        const targetUser = await db.collection('users').findOne({ walletAddress: challenged })

        if (!targetUser) {
            await client.close()
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        if (targetUser.settings?.acceptChallenges === false) {
            await client.close()
            return NextResponse.json(
                { error: 'This user is not accepting challenges' },
                { status: 403 }
            )
        }

        // Check if there's already a pending challenge between these users
        const existingChallenge = await db.collection('challenges').findOne({
            $or: [
                { challenger, challenged, status: 'pending' },
                { challenger: challenged, challenged: challenger, status: 'pending' }
            ]
        })

        if (existingChallenge) {
            await client.close()
            return NextResponse.json(
                { error: 'There is already a pending challenge between you two' },
                { status: 409 }
            )
        }

        // Check if challenger has enough balance for bet
        if (betAmount > 0) {
            const gameBalance = await db.collection('game_balances').findOne({ walletAddress: challenger })

            if (!gameBalance || gameBalance.gameBalance < betAmount) {
                await client.close()
                return NextResponse.json(
                    { error: 'Insufficient $GAME balance for this bet' },
                    { status: 400 }
                )
            }
        }

        const now = new Date()
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

        const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const challenge = {
            challengeId,
            challenger,
            challenged,
            gameType,
            timeControl,
            betAmount,
            color,
            message,
            status: 'pending',
            expiresAt,
            createdAt: now
        }

        await db.collection('challenges').insertOne(challenge)

        // Get challenger info for notification
        const challengerUser = await db.collection('users').findOne({ walletAddress: challenger })

        // Create notification for challenged user
        await db.collection('notifications').insertOne({
            userId: challenged,
            type: 'challenge',
            title: '¡Nuevo desafío!',
            message: `${challengerUser?.username || 'Alguien'} te ha desafiado a una partida`,
            data: {
                challengeId,
                challenger,
                challengerUsername: challengerUser?.username,
                betAmount,
                timeControl,
                gameType
            },
            fromUser: challenger,
            read: false,
            dismissed: false,
            actionUrl: '/dashboard',
            createdAt: now
        })

        await client.close()

        return NextResponse.json({
            success: true,
            message: 'Challenge sent!',
            challenge: {
                challengeId,
                challenged: {
                    walletAddress: challenged,
                    username: targetUser.username
                },
                betAmount,
                timeControl,
                expiresAt
            }
        })

    } catch (error) {
        console.error('Send challenge error:', error)
        return NextResponse.json(
            { error: 'Failed to send challenge', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/user/challenges
 * Accept or decline a challenge
 */
export async function PUT(request) {
    try {
        const body = await request.json()
        const { challengeId, walletAddress, action } = body // action: 'accept' | 'decline'

        if (!challengeId || !walletAddress || !action) {
            return NextResponse.json(
                { error: 'challengeId, walletAddress, and action are required' },
                { status: 400 }
            )
        }

        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use: accept or decline' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Find the challenge
        const challenge = await db.collection('challenges').findOne({ challengeId })

        if (!challenge) {
            await client.close()
            return NextResponse.json(
                { error: 'Challenge not found' },
                { status: 404 }
            )
        }

        // Verify the user is the challenged
        if (challenge.challenged !== walletAddress) {
            await client.close()
            return NextResponse.json(
                { error: 'Not authorized to respond to this challenge' },
                { status: 403 }
            )
        }

        // Check if challenge is still valid
        if (challenge.status !== 'pending') {
            await client.close()
            return NextResponse.json(
                { error: 'This challenge is no longer pending' },
                { status: 400 }
            )
        }

        if (new Date() > new Date(challenge.expiresAt)) {
            await db.collection('challenges').updateOne(
                { challengeId },
                { $set: { status: 'expired' } }
            )
            await client.close()
            return NextResponse.json(
                { error: 'This challenge has expired' },
                { status: 400 }
            )
        }

        const now = new Date()

        if (action === 'decline') {
            await db.collection('challenges').updateOne(
                { challengeId },
                { $set: { status: 'declined', respondedAt: now } }
            )

            // Notify challenger
            await db.collection('notifications').insertOne({
                userId: challenge.challenger,
                type: 'challenge_declined',
                title: 'Desafío rechazado',
                message: 'Tu desafío fue rechazado',
                data: { challengeId },
                fromUser: walletAddress,
                read: false,
                dismissed: false,
                createdAt: now
            })

            await client.close()

            return NextResponse.json({
                success: true,
                action: 'declined'
            })
        }

        // Accept challenge
        // Check if both users have enough balance for bet
        if (challenge.betAmount > 0) {
            const challengedBalance = await db.collection('game_balances').findOne({
                walletAddress: challenge.challenged
            })

            if (!challengedBalance || challengedBalance.gameBalance < challenge.betAmount) {
                await client.close()
                return NextResponse.json(
                    { error: 'Insufficient $GAME balance for this bet' },
                    { status: 400 }
                )
            }

            // Deduct bet from both users
            await db.collection('game_balances').updateOne(
                { walletAddress: challenge.challenger },
                {
                    $inc: {
                        gameBalance: -challenge.betAmount,
                        totalSpent: challenge.betAmount
                    }
                }
            )

            await db.collection('game_balances').updateOne(
                { walletAddress: challenge.challenged },
                {
                    $inc: {
                        gameBalance: -challenge.betAmount,
                        totalSpent: challenge.betAmount
                    }
                }
            )
        }

        // Create game
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Determine colors
        let whitePlayer, blackPlayer
        if (challenge.color === 'random') {
            if (Math.random() > 0.5) {
                whitePlayer = challenge.challenger
                blackPlayer = challenge.challenged
            } else {
                whitePlayer = challenge.challenged
                blackPlayer = challenge.challenger
            }
        } else if (challenge.color === 'white') {
            whitePlayer = challenge.challenger
            blackPlayer = challenge.challenged
        } else {
            whitePlayer = challenge.challenged
            blackPlayer = challenge.challenger
        }

        const game = {
            gameId,
            type: challenge.gameType,
            status: 'active',
            whitePlayer,
            blackPlayer,
            betAmount: challenge.betAmount,
            totalPot: challenge.betAmount * 2,
            timeControl: challenge.timeControl,
            challengeId,
            moves: [],
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            createdAt: now,
            startedAt: now
        }

        await db.collection('games').insertOne(game)

        // Update challenge
        await db.collection('challenges').updateOne(
            { challengeId },
            {
                $set: {
                    status: 'accepted',
                    respondedAt: now,
                    gameId
                }
            }
        )

        // Notify challenger
        await db.collection('notifications').insertOne({
            userId: challenge.challenger,
            type: 'challenge_accepted',
            title: '¡Desafío aceptado!',
            message: 'Tu desafío fue aceptado. ¡La partida comienza!',
            data: {
                challengeId,
                gameId,
                opponent: walletAddress
            },
            fromUser: walletAddress,
            read: false,
            dismissed: false,
            actionUrl: `/game/${gameId}`,
            createdAt: now
        })

        await client.close()

        return NextResponse.json({
            success: true,
            action: 'accepted',
            game: {
                gameId,
                whitePlayer,
                blackPlayer,
                betAmount: challenge.betAmount,
                totalPot: challenge.betAmount * 2,
                timeControl: challenge.timeControl
            }
        })

    } catch (error) {
        console.error('Respond to challenge error:', error)
        return NextResponse.json(
            { error: 'Failed to respond to challenge', details: error.message },
            { status: 500 }
        )
    }
}
