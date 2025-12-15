import { NextResponse } from 'next/server'

// Shared game storage - persists across API calls
const getGamesStorage = () => {
    if (!global.gamesStorage) {
        global.gamesStorage = {
            games: [
                // Pre-populated demo games for better UX
                {
                    gameId: 1,
                    player1: 'DemoPlayer1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                    player1Username: 'GrandMaster_Rex',
                    player2: null,
                    betAmount: 150,
                    totalPot: 150,
                    timeControl: '5+0',
                    title: 'Blitz Battle - 150 CHESS',
                    status: 'waiting',
                    winner: null,
                    createdAt: Date.now() - 300000,
                    startedAt: null,
                    endedAt: null
                },
                {
                    gameId: 2,
                    player1: 'DemoPlayer2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                    player1Username: 'ChessQueen_99',
                    player2: null,
                    betAmount: 75,
                    totalPot: 75,
                    timeControl: '10+5',
                    title: 'Rapid Match - 75 CHESS',
                    status: 'waiting',
                    winner: null,
                    createdAt: Date.now() - 600000,
                    startedAt: null,
                    endedAt: null
                }
            ],
            gameIdCounter: 3
        }
    }
    return global.gamesStorage
}

// Game status enum
const GameStatus = {
    Waiting: 'waiting',
    Active: 'active',
    Completed: 'completed',
    Draw: 'draw',
    Cancelled: 'cancelled',
    Timeout: 'timeout'
}

/**
 * GET /api/game - Get all games or filter by status
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const walletAddress = searchParams.get('wallet')

        const storage = getGamesStorage()
        let filteredGames = [...storage.games]

        // Filter by status
        if (status) {
            filteredGames = filteredGames.filter(g => g.status === status)
        }

        // Filter by player wallet
        if (walletAddress) {
            filteredGames = filteredGames.filter(g =>
                g.player1 === walletAddress || g.player2 === walletAddress
            )
        }

        // Sort by creation date (newest first)
        filteredGames.sort((a, b) => b.createdAt - a.createdAt)

        return NextResponse.json({
            success: true,
            games: filteredGames,
            total: filteredGames.length,
            activeGames: storage.games.filter(g => g.status === 'active').length,
            waitingGames: storage.games.filter(g => g.status === 'waiting').length
        })
    } catch (error) {
        console.error('Error fetching games:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/game - Create a new game
 * Body: { walletAddress, betAmount, timeControl, gameTitle, username }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, betAmount, timeControl, gameTitle, username } = body

        // Validations
        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Wallet address is required' },
                { status: 400 }
            )
        }

        if (!betAmount || betAmount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Bet amount must be greater than 0' },
                { status: 400 }
            )
        }

        const storage = getGamesStorage()

        // Create new game
        const newGame = {
            gameId: storage.gameIdCounter++,
            player1: walletAddress,
            player1Username: username || `Player_${walletAddress.slice(0, 6)}`,
            player2: null,
            player2Username: null,
            betAmount: betAmount,
            totalPot: betAmount,
            timeControl: timeControl || '10+0',
            title: gameTitle || `Match #${storage.gameIdCounter - 1} - ${betAmount} CHESS`,
            status: GameStatus.Waiting,
            winner: null,
            createdAt: Date.now(),
            startedAt: null,
            endedAt: null,
            moves: [],
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        }

        storage.games.push(newGame)

        console.log(`🎮 Game ${newGame.gameId} created by ${username || walletAddress.slice(0, 8)} with ${betAmount} CHESS bet`)

        return NextResponse.json({
            success: true,
            gameId: newGame.gameId,
            game: newGame,
            signature: `create_game_${newGame.gameId}_${Date.now()}`
        })
    } catch (error) {
        console.error('Error creating game:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

