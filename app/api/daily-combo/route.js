import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Daily combo reward
const COMBO_REWARD = 50000 // 50,000 $GAME for solving daily combo

// Generate deterministic daily combo based on date
function generateDailyCombo(dateString) {
    const seed = dateString.split('-').reduce((acc, val) => acc + parseInt(val), 0)
    const cards = ['♔', '♕', '♖', '♗', '♘', '♙', '🏆', '⚔️', '💎', '🎮', '🔥', '👑']
    const combo = []

    // Generate 3 card combo
    for (let i = 0; i < 3; i++) {
        const index = (seed * (i + 1) * 7) % cards.length
        combo.push(cards[index])
    }

    return combo
}

// Generate daily cipher (morse-like code)
function generateDailyCipher(dateString) {
    const words = ['CHESS', 'KING', 'QUEEN', 'MATE', 'PAWN', 'ROOK', 'KNIGHT', 'BISHOP', 'GAME', 'TOKEN']
    const seed = dateString.split('-').reduce((acc, val) => acc + parseInt(val), 0)
    return words[seed % words.length]
}

/**
 * GET /api/daily-combo
 * Get today's challenge status
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')

        const today = new Date().toISOString().split('T')[0]
        const dailyCombo = generateDailyCombo(today)
        const dailyCipher = generateDailyCipher(today)

        // Add clue about today's combo (partial reveal)
        const comboHint = dailyCombo.map((card, i) => i === 0 ? card : '❓').join(' ')
        const cipherHint = dailyCipher.charAt(0) + '•'.repeat(dailyCipher.length - 1)

        let userStatus = {
            comboSolved: false,
            cipherSolved: false,
            comboAttempts: 0,
            cipherAttempts: 0
        }

        if (walletAddress) {
            const client = new MongoClient(MONGODB_URI)
            await client.connect()
            const db = client.db(DB_NAME)

            const record = await db.collection('daily_challenges').findOne({
                walletAddress,
                date: today
            })

            if (record) {
                userStatus = {
                    comboSolved: record.comboSolved || false,
                    cipherSolved: record.cipherSolved || false,
                    comboAttempts: record.comboAttempts || 0,
                    cipherAttempts: record.cipherAttempts || 0
                }
            }

            // Get global stats
            const solvedCount = await db.collection('daily_challenges').countDocuments({
                date: today,
                $or: [{ comboSolved: true }, { cipherSolved: true }]
            })

            await client.close()

            return NextResponse.json({
                success: true,
                date: today,
                combo: {
                    hint: comboHint,
                    length: dailyCombo.length,
                    solved: userStatus.comboSolved,
                    attempts: userStatus.comboAttempts,
                    reward: COMBO_REWARD
                },
                cipher: {
                    hint: cipherHint,
                    length: dailyCipher.length,
                    solved: userStatus.cipherSolved,
                    attempts: userStatus.cipherAttempts,
                    reward: COMBO_REWARD
                },
                globalStats: {
                    solversToday: solvedCount
                },
                message: 'Ask friends or search social media for today\'s solution! 🔍'
            })
        }

        return NextResponse.json({
            success: true,
            date: today,
            combo: {
                hint: comboHint,
                length: dailyCombo.length,
                reward: COMBO_REWARD
            },
            cipher: {
                hint: cipherHint,
                length: dailyCipher.length,
                reward: COMBO_REWARD
            },
            message: 'Connect wallet to participate!'
        })

    } catch (error) {
        console.error('Daily combo GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/daily-combo
 * Submit solution attempt
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, type, solution } = body

        if (!walletAddress || !type || !solution) {
            return NextResponse.json({
                error: 'walletAddress, type, and solution required'
            }, { status: 400 })
        }

        const today = new Date().toISOString().split('T')[0]
        const dailyCombo = generateDailyCombo(today)
        const dailyCipher = generateDailyCipher(today)

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Get or create today's record
        let record = await db.collection('daily_challenges').findOne({
            walletAddress,
            date: today
        })

        if (!record) {
            record = {
                walletAddress,
                date: today,
                comboSolved: false,
                cipherSolved: false,
                comboAttempts: 0,
                cipherAttempts: 0,
                createdAt: new Date()
            }
            await db.collection('daily_challenges').insertOne(record)
        }

        let isCorrect = false
        let alreadySolved = false
        const now = new Date()

        if (type === 'combo') {
            if (record.comboSolved) {
                alreadySolved = true
            } else {
                // Check if solution matches (can be array or string)
                const solutionArray = Array.isArray(solution) ? solution : solution.split(' ')
                isCorrect = solutionArray.length === dailyCombo.length &&
                    solutionArray.every((card, i) => card === dailyCombo[i])

                // Update attempts
                await db.collection('daily_challenges').updateOne(
                    { walletAddress, date: today },
                    {
                        $inc: { comboAttempts: 1 },
                        $set: isCorrect ? { comboSolved: true, comboSolvedAt: now } : {}
                    }
                )
            }
        } else if (type === 'cipher') {
            if (record.cipherSolved) {
                alreadySolved = true
            } else {
                isCorrect = solution.toUpperCase() === dailyCipher

                await db.collection('daily_challenges').updateOne(
                    { walletAddress, date: today },
                    {
                        $inc: { cipherAttempts: 1 },
                        $set: isCorrect ? { cipherSolved: true, cipherSolvedAt: now } : {}
                    }
                )
            }
        }

        // Award tokens if correct
        if (isCorrect && !alreadySolved) {
            await db.collection('game_balances').updateOne(
                { walletAddress },
                {
                    $inc: { gameBalance: COMBO_REWARD },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            )

            // Create notification
            await db.collection('notifications').insertOne({
                userId: walletAddress,
                type: 'daily_combo',
                title: type === 'combo' ? '🎯 Daily Combo!' : '🔐 Daily Cipher!',
                message: `You solved today's ${type}! +${COMBO_REWARD.toLocaleString()} $GAME`,
                data: { reward: COMBO_REWARD, type },
                read: false,
                createdAt: now
            })

            // Update squad if member
            const membership = await db.collection('squad_members').findOne({ walletAddress })
            if (membership) {
                await db.collection('squads').updateOne(
                    { _id: membership.squadId },
                    { $inc: { weeklyScore: 100 } }
                )
            }
        }

        await client.close()

        if (alreadySolved) {
            return NextResponse.json({
                success: false,
                message: `Ya resolviste el ${type === 'combo' ? 'combo' : 'cifrado'} de hoy`,
                alreadySolved: true
            })
        }

        return NextResponse.json({
            success: isCorrect,
            correct: isCorrect,
            message: isCorrect
                ? `🎉 ¡Correcto! Has ganado ${COMBO_REWARD.toLocaleString()} $GAME`
                : '❌ Incorrecto. ¡Pregunta a tus amigos o busca en redes sociales!',
            reward: isCorrect ? COMBO_REWARD : 0,
            shareMessage: isCorrect
                ? `🎯 ¡Resolví el ${type} diario en ChessDAO y gané ${COMBO_REWARD.toLocaleString()} $GAME! ¿Puedes hacerlo tú? 🏆`
                : null
        })

    } catch (error) {
        console.error('Daily combo POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
