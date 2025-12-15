import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017')

// Puzzle database with solutions
const puzzles = {
    daily: null,
    lastUpdated: null,
    database: [
        // Easy puzzles
        {
            id: 'p001',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
            solution: ['Qxf7#'],
            title: 'Mate del Pastor',
            description: 'Blancas mueven y dan mate en 1',
            rating: 600,
            difficulty: 'easy',
            theme: 'scholars_mate'
        },
        {
            id: 'p002',
            fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
            solution: ['Re8#'],
            title: 'Mate de Corredor',
            description: 'Blancas mueven y dan mate en 1',
            rating: 700,
            difficulty: 'easy',
            theme: 'back_rank_mate'
        },
        // Medium puzzles
        {
            id: 'p003',
            fen: 'r1b1kb1r/pppp1ppp/2n2n2/4N2Q/2B1q3/8/PPPP1PPP/RNB1K2R w KQkq - 0 1',
            solution: ['Nxf7', 'Qxf7', 'Qxf7#'],
            title: 'Sacrificio de Caballo',
            description: 'Blancas mueven y dan mate en 2',
            rating: 1200,
            difficulty: 'medium',
            theme: 'sacrifice'
        },
        {
            id: 'p004',
            fen: '5rk1/1p3ppp/pq6/8/8/1P2Q3/P4PPP/5RK1 w - - 0 1',
            solution: ['Qe8', 'Rxe8', 'Rxe8#'],
            title: 'Mate en la Octava',
            description: 'Blancas mueven y dan mate en 2',
            rating: 1300,
            difficulty: 'medium',
            theme: 'back_rank_mate'
        },
        // Hard puzzles
        {
            id: 'p005',
            fen: 'r1b1r1k1/1pqn1pbp/p2p2p1/2pP4/P1P1N3/2N1BP2/1P1QB1PP/R4RK1 w - - 0 1',
            solution: ['Nf6+', 'Bxf6', 'Qxh7+', 'Kxh7', 'Rh1#'],
            title: 'Ataque Griego',
            description: 'Blancas mueven y dan mate en 3',
            rating: 1800,
            difficulty: 'hard',
            theme: 'greek_gift'
        },
        {
            id: 'p006',
            fen: 'r4rk1/ppp2ppp/8/4N3/1bBn4/8/PPPP1PPP/R1BQ1RK1 w - - 0 1',
            solution: ['Qxd4', 'Bxd4', 'Nf7#'],
            title: 'Mate Ahogado',
            description: 'Blancas mueven y dan mate en 2',
            rating: 1600,
            difficulty: 'hard',
            theme: 'smothered_mate'
        },
        // Master puzzles
        {
            id: 'p007',
            fen: 'r1bq1rk1/ppppbppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQ - 0 1',
            solution: ['Nxf7', 'Rxf7', 'Bxf7+', 'Kxf7', 'Qf3+'],
            title: 'Ataque Fegatello',
            description: 'Encuentra la mejor continuación',
            rating: 2100,
            difficulty: 'master',
            theme: 'attack'
        }
    ]
}

// Get daily puzzle (changes every 24 hours)
function getDailyPuzzle() {
    const today = new Date().toDateString()

    if (puzzles.lastUpdated !== today) {
        // Select puzzle based on day of year
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
        const puzzleIndex = dayOfYear % puzzles.database.length
        puzzles.daily = puzzles.database[puzzleIndex]
        puzzles.lastUpdated = today
    }

    return puzzles.daily
}

// GET - Get puzzles
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'daily'
        const difficulty = searchParams.get('difficulty')
        const wallet = searchParams.get('wallet')

        // Get user progress if wallet provided
        let userProgress = null
        if (wallet) {
            try {
                await client.connect()
                const db = client.db('chessdao')
                userProgress = await db.collection('puzzle_progress').findOne({ walletAddress: wallet })
            } catch (e) {
                console.log('DB not available for progress')
            }
        }

        if (type === 'daily') {
            const dailyPuzzle = getDailyPuzzle()
            return NextResponse.json({
                success: true,
                puzzle: dailyPuzzle,
                date: new Date().toISOString().split('T')[0],
                userProgress: userProgress || { streak: 0, totalSolved: 0 }
            })
        }

        if (type === 'random') {
            let filtered = puzzles.database
            if (difficulty) {
                filtered = puzzles.database.filter(p => p.difficulty === difficulty)
            }
            const randomPuzzle = filtered[Math.floor(Math.random() * filtered.length)]
            return NextResponse.json({
                success: true,
                puzzle: randomPuzzle,
                userProgress: userProgress || { streak: 0, totalSolved: 0 }
            })
        }

        if (type === 'all') {
            let filtered = puzzles.database
            if (difficulty) {
                filtered = puzzles.database.filter(p => p.difficulty === difficulty)
            }
            return NextResponse.json({
                success: true,
                puzzles: filtered,
                total: filtered.length,
                userProgress: userProgress || { streak: 0, totalSolved: 0 }
            })
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid type parameter'
        }, { status: 400 })

    } catch (error) {
        console.error('Error fetching puzzles:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}

// POST - Save puzzle attempt/solution
export async function POST(request) {
    try {
        const body = await request.json()
        const { wallet, puzzleId, solved, attempts, difficulty } = body

        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Wallet required' }, { status: 400 })
        }

        // Calculate rewards
        let reward = 0
        if (solved) {
            switch (difficulty) {
                case 'easy': reward = 5; break
                case 'medium': reward = 15; break
                case 'hard': reward = 30; break
                case 'master': reward = 50; break
            }
            // Bonus for fewer attempts
            if (attempts === 1) reward *= 1.5
        }

        // Save to MongoDB
        try {
            await client.connect()
            const db = client.db('chessdao')

            // Get current progress
            const currentProgress = await db.collection('puzzle_progress').findOne({ walletAddress: wallet })
            const currentStreak = currentProgress?.streak || 0
            const newStreak = solved ? currentStreak + 1 : 0

            // Update progress
            await db.collection('puzzle_progress').updateOne(
                { walletAddress: wallet },
                {
                    $set: {
                        walletAddress: wallet,
                        streak: newStreak,
                        lastPuzzleDate: new Date().toISOString().split('T')[0],
                        updatedAt: new Date()
                    },
                    $inc: {
                        totalSolved: solved ? 1 : 0,
                        totalAttempts: 1,
                        totalRewards: Math.floor(reward)
                    },
                    $push: {
                        history: {
                            $each: [{
                                puzzleId,
                                solved,
                                attempts,
                                difficulty,
                                reward: Math.floor(reward),
                                date: new Date()
                            }],
                            $slice: -50 // Keep last 50 entries
                        }
                    }
                },
                { upsert: true }
            )

            // Add reward to game_balances if solved
            if (solved && reward > 0) {
                await db.collection('game_balances').updateOne(
                    { walletAddress: wallet },
                    {
                        $inc: { balance: Math.floor(reward) },
                        $set: { updatedAt: new Date() }
                    },
                    { upsert: true }
                )
            }

            console.log(`📊 Puzzle saved: ${puzzleId} by ${wallet.slice(0, 8)}... Solved: ${solved}, Reward: ${Math.floor(reward)}`)

            return NextResponse.json({
                success: true,
                saved: true,
                reward: Math.floor(reward),
                newStreak,
                message: solved ? `¡Ganaste ${Math.floor(reward)} $GAME!` : 'Intenta de nuevo'
            })

        } catch (dbError) {
            console.error('DB error:', dbError)
            // Return success anyway but with warning
            return NextResponse.json({
                success: true,
                saved: false,
                reward: Math.floor(reward),
                message: solved ? `¡Puzzle resuelto! (guardado localmente)` : 'Intenta de nuevo'
            })
        }

    } catch (error) {
        console.error('Error saving puzzle attempt:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}

