'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, RotateCcw, Clock, Trophy, Brain, Loader2 } from 'lucide-react'

export default function ChessBoardWithAI({ difficulty = 'medium', onBack }) {
    const [game, setGame] = useState(new Chess())
    const [boardPosition, setBoardPosition] = useState('start')
    const [moveHistory, setMoveHistory] = useState([])
    const [gameStatus, setGameStatus] = useState('active')
    const [winner, setWinner] = useState(null)
    const [currentTurn, setCurrentTurn] = useState('white')
    const [isAIThinking, setIsAIThinking] = useState(false)
    const [aiDifficulty, setAiDifficulty] = useState(difficulty)
    const stockfishRef = useRef(null)
    const [engineReady, setEngineReady] = useState(false)

    const difficultySettings = {
        easy: { depth: 3, skillLevel: 3, name: 'Easy', elo: '1000' },
        medium: { depth: 8, skillLevel: 10, name: 'Medium', elo: '1600' },
        hard: { depth: 12, skillLevel: 15, name: 'Hard', elo: '2000' },
        master: { depth: 18, skillLevel: 20, name: 'Master', elo: '2500' }
    }

    // Initialize Stockfish
    useEffect(() => {
        if (typeof window === 'undefined') return

        const initStockfish = async () => {
            try {
                // Use stockfish.js WASM version
                const wasmSupported = typeof WebAssembly === 'object'
                const stockfish = new Worker(
                    wasmSupported
                        ? '/stockfish/stockfish.js'
                        : '/stockfish/stockfish.js'
                )

                stockfish.onmessage = (event) => {
                    const message = event.data
                    console.log('Stockfish:', message)

                    if (message === 'uciok') {
                        setEngineReady(true)
                        // Apply difficulty settings
                        const settings = difficultySettings[aiDifficulty]
                        stockfish.postMessage(`setoption name Skill Level value ${settings.skillLevel}`)
                        stockfish.postMessage('isready')
                    }

                    if (message.startsWith('bestmove')) {
                        const match = message.match(/bestmove\s+(\S+)/)
                        if (match && match[1] !== '(none)') {
                            const bestMove = match[1]
                            makeAIMove(bestMove)
                        }
                        setIsAIThinking(false)
                    }
                }

                stockfish.postMessage('uci')
                stockfishRef.current = stockfish
            } catch (error) {
                console.error('Failed to initialize Stockfish:', error)
                // Fallback to simple AI
                setEngineReady(true)
            }
        }

        initStockfish()

        return () => {
            if (stockfishRef.current) {
                stockfishRef.current.terminate()
            }
        }
    }, [])

    // Update difficulty when changed
    useEffect(() => {
        if (stockfishRef.current && engineReady) {
            const settings = difficultySettings[aiDifficulty]
            stockfishRef.current.postMessage(`setoption name Skill Level value ${settings.skillLevel}`)
        }
    }, [aiDifficulty, engineReady])

    const makeAIMove = useCallback((moveString) => {
        setGame((currentGame) => {
            const gameCopy = new Chess(currentGame.fen())

            try {
                // Parse move string (e.g., "e2e4" or "e7e8q")
                const from = moveString.substring(0, 2)
                const to = moveString.substring(2, 4)
                const promotion = moveString.length > 4 ? moveString[4] : undefined

                const move = gameCopy.move({
                    from,
                    to,
                    promotion: promotion || 'q'
                })

                if (move) {
                    setBoardPosition(gameCopy.fen())
                    setMoveHistory(prev => [...prev, move])
                    setCurrentTurn(gameCopy.turn() === 'w' ? 'white' : 'black')

                    // Check for game end
                    if (gameCopy.isGameOver()) {
                        if (gameCopy.isCheckmate()) {
                            setGameStatus('checkmate')
                            setWinner('black') // AI wins
                        } else {
                            setGameStatus('draw')
                            setWinner('draw')
                        }
                    }
                }
            } catch (error) {
                console.error('AI move error:', error)
            }

            return gameCopy
        })
    }, [])

    // Simple fallback AI when Stockfish not available
    const getSimpleAIMove = useCallback((fen) => {
        const tempGame = new Chess(fen)
        const moves = tempGame.moves({ verbose: true })
        if (moves.length > 0) {
            // For easy: random move
            // For harder: prefer captures and checks
            let selectedMove

            if (aiDifficulty === 'easy') {
                selectedMove = moves[Math.floor(Math.random() * moves.length)]
            } else {
                // Prefer captures, then checks, then random
                const captures = moves.filter(m => m.captured)
                const checks = moves.filter(m => {
                    const test = new Chess(fen)
                    test.move(m)
                    return test.isCheck()
                })

                if (captures.length > 0 && Math.random() > 0.3) {
                    selectedMove = captures[Math.floor(Math.random() * captures.length)]
                } else if (checks.length > 0 && Math.random() > 0.5) {
                    selectedMove = checks[Math.floor(Math.random() * checks.length)]
                } else {
                    selectedMove = moves[Math.floor(Math.random() * moves.length)]
                }
            }

            return selectedMove.from + selectedMove.to + (selectedMove.promotion || '')
        }
        return null
    }, [aiDifficulty])

    const requestAIMove = useCallback((fen) => {
        if (!engineReady) {
            // Use simple AI fallback
            setTimeout(() => {
                const move = getSimpleAIMove(fen)
                if (move) {
                    makeAIMove(move)
                }
                setIsAIThinking(false)
            }, 500)
            return
        }

        if (stockfishRef.current) {
            const settings = difficultySettings[aiDifficulty]
            stockfishRef.current.postMessage(`position fen ${fen}`)
            stockfishRef.current.postMessage(`go depth ${settings.depth}`)
        } else {
            // Fallback
            setTimeout(() => {
                const move = getSimpleAIMove(fen)
                if (move) {
                    makeAIMove(move)
                }
                setIsAIThinking(false)
            }, 500)
        }
    }, [engineReady, aiDifficulty, makeAIMove, getSimpleAIMove])

    const onPieceDrop = useCallback((sourceSquare, targetSquare) => {
        if (isAIThinking || gameStatus !== 'active') {
            return false
        }

        // Only allow moves when it's player's turn (white)
        if (currentTurn !== 'white') {
            return false
        }

        try {
            const gameCopy = new Chess(game.fen())
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q'
            })

            if (move) {
                // Update state
                setGame(gameCopy)
                setBoardPosition(gameCopy.fen())
                setMoveHistory(prev => [...prev, move])
                setCurrentTurn('black')

                // Check for game end after player move
                if (gameCopy.isGameOver()) {
                    if (gameCopy.isCheckmate()) {
                        setGameStatus('checkmate')
                        setWinner('white') // Player wins
                    } else {
                        setGameStatus('draw')
                        setWinner('draw')
                    }
                    return true
                }

                // Request AI move
                setIsAIThinking(true)
                setTimeout(() => {
                    requestAIMove(gameCopy.fen())
                }, 300)

                return true
            }
        } catch (error) {
            console.error('Move error:', error)
        }

        return false
    }, [game, isAIThinking, gameStatus, currentTurn, requestAIMove])

    const resetGame = () => {
        const newGame = new Chess()
        setGame(newGame)
        setBoardPosition('start')
        setMoveHistory([])
        setGameStatus('active')
        setWinner(null)
        setCurrentTurn('white')
        setIsAIThinking(false)
    }

    const currentSettings = difficultySettings[aiDifficulty]

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Header */}
            <Card className="bg-slate-800 border-slate-600 mb-4">
                <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg">
                                <Bot className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-white">AI Practice Mode</CardTitle>
                                <p className="text-slate-400 text-sm">
                                    Playing against {currentSettings.name} ({currentSettings.elo} ELO)
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAIThinking && (
                                <Badge className="bg-yellow-500 text-black flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    AI Thinking...
                                </Badge>
                            )}
                            <Badge className={gameStatus === 'active' ? 'bg-green-500' : 'bg-red-500'}>
                                {gameStatus === 'active'
                                    ? (currentTurn === 'white' ? 'Your Turn' : 'AI Turn')
                                    : gameStatus.toUpperCase()
                                }
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="flex gap-4">
                {/* Chess Board */}
                <div className="flex-1">
                    <Card className="bg-slate-800 border-slate-600 p-4">
                        {/* AI Info */}
                        <div className="flex items-center justify-between mb-3 p-2 bg-slate-700/50 rounded">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-cyan-400" />
                                <span className="text-white font-medium">Stockfish AI</span>
                                <Badge variant="outline" className="text-xs">{currentSettings.elo}</Badge>
                            </div>
                            {isAIThinking && (
                                <Brain className="h-5 w-5 text-yellow-400 animate-pulse" />
                            )}
                        </div>

                        {/* Board */}
                        <div className="aspect-square">
                            <Chessboard
                                position={boardPosition}
                                onPieceDrop={onPieceDrop}
                                boardOrientation="white"
                                arePiecesDraggable={!isAIThinking && gameStatus === 'active' && currentTurn === 'white'}
                                customBoardStyle={{
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                                }}
                                customDarkSquareStyle={{ backgroundColor: '#4B5563' }}
                                customLightSquareStyle={{ backgroundColor: '#D1D5DB' }}
                            />
                        </div>

                        {/* Player Info */}
                        <div className="flex items-center justify-between mt-3 p-2 bg-blue-900/30 rounded border border-blue-700/50">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                                    👤
                                </div>
                                <span className="text-white font-medium">You</span>
                            </div>
                            <span className="text-slate-400 text-sm">Playing as White</span>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-between mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetGame}
                                className="border-slate-600 hover:bg-slate-700"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                New Game
                            </Button>

                            {onBack && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onBack}
                                    className="border-slate-600 hover:bg-slate-700"
                                >
                                    Back to Lobby
                                </Button>
                            )}
                        </div>

                        {/* Game Over Overlay */}
                        {gameStatus !== 'active' && (
                            <div className="mt-4 p-4 bg-slate-700 rounded-lg text-center">
                                <Trophy className={`h-12 w-12 mx-auto mb-2 ${winner === 'white' ? 'text-yellow-400' : 'text-slate-400'}`} />
                                <h3 className="text-xl font-bold text-white">
                                    {winner === 'white' ? '🎉 You Win!' : winner === 'draw' ? 'Draw!' : 'AI Wins!'}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    {gameStatus === 'checkmate' ? 'Checkmate!' : 'Game ended in a draw'}
                                </p>
                                <Button onClick={resetGame} className="mt-3 bg-green-600 hover:bg-green-700">
                                    Play Again
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Side Panel */}
                <div className="w-64 space-y-4">
                    {/* Difficulty Selector */}
                    <Card className="bg-slate-800 border-slate-600">
                        <CardHeader className="py-3">
                            <CardTitle className="text-white text-sm">Difficulty</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                            {Object.entries(difficultySettings).map(([key, settings]) => (
                                <Button
                                    key={key}
                                    onClick={() => setAiDifficulty(key)}
                                    variant={aiDifficulty === key ? 'default' : 'outline'}
                                    size="sm"
                                    className={`w-full justify-between ${aiDifficulty === key
                                            ? 'bg-cyan-600 hover:bg-cyan-700'
                                            : 'border-slate-600 hover:bg-slate-700'
                                        }`}
                                    disabled={moveHistory.length > 0}
                                >
                                    <span>{settings.name}</span>
                                    <span className="text-xs opacity-70">{settings.elo}</span>
                                </Button>
                            ))}
                            {moveHistory.length > 0 && (
                                <p className="text-xs text-slate-400 text-center">
                                    Reset game to change difficulty
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Move History */}
                    <Card className="bg-slate-800 border-slate-600">
                        <CardHeader className="py-3">
                            <CardTitle className="text-white text-sm">Moves ({moveHistory.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-64 overflow-y-auto space-y-1 pt-0">
                            {moveHistory.length === 0 ? (
                                <p className="text-slate-400 text-xs">Make your first move!</p>
                            ) : (
                                moveHistory.map((move, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs bg-slate-700/50 p-1 rounded">
                                        <span className="text-slate-400 w-6">{Math.floor(idx / 2) + 1}.</span>
                                        <span className={idx % 2 === 0 ? 'text-white' : 'text-cyan-400'}>
                                            {move.san}
                                        </span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
