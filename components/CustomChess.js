'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'

const PIECES = {
    'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚'
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

export default function CustomChess({
    onBack,
    betAmount = 0,
    onGameEnd,
    vsAI = true,
    difficulty = 'medium'
}) {
    const [game, setGame] = useState(null)
    const [board, setBoard] = useState([])
    const [selected, setSelected] = useState(null)
    const [validMoves, setValidMoves] = useState([])
    const [gameOver, setGameOver] = useState(false)
    const [result, setResult] = useState(null)
    const [isAIThinking, setIsAIThinking] = useState(false)
    const [lastMove, setLastMove] = useState(null)
    const [moveHistory, setMoveHistory] = useState([])
    const [dragging, setDragging] = useState(null)
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
    const boardRef = useRef(null)

    // Initialize game
    useEffect(() => {
        const chess = new Chess()
        setGame(chess)
        updateBoard(chess)
    }, [])

    const updateBoard = useCallback((chess) => {
        const newBoard = []
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = FILES[file] + RANKS[rank]
                const piece = chess.get(square)
                newBoard.push({
                    square,
                    piece: piece ? piece.color + piece.type : null,
                    isLight: (rank + file) % 2 === 0
                })
            }
        }
        setBoard(newBoard)
    }, [])

    // Define handleGameOver FIRST to avoid circular dependency
    const handleGameOver = useCallback(() => {
        setGameOver(true)
        let gameResult
        if (game?.isCheckmate()) {
            const winner = game.turn() === 'w' ? 'black' : 'white'
            gameResult = { type: 'checkmate', winner }
        } else {
            gameResult = { type: 'draw' }
        }
        setResult(gameResult)
        onGameEnd?.(gameResult)
    }, [game, onGameEnd])

    const makeMove = useCallback((from, to) => {
        if (!game) return false

        try {
            // Create a new Chess instance for proper React state update
            const gameCopy = new Chess(game.fen())
            const move = gameCopy.move({
                from,
                to,
                promotion: 'q'
            })

            if (move) {
                console.log(`✅ Player move: ${move.san} (${from} → ${to})`)
                setGame(gameCopy)
                setLastMove({ from, to })
                setMoveHistory(prev => [...prev, move])
                updateBoard(gameCopy)
                setSelected(null)
                setValidMoves([])

                if (gameCopy.isGameOver()) {
                    handleGameOver()
                    return true
                }

                if (vsAI) {
                    setIsAIThinking(true)
                    // Inline AI move logic to avoid stale closure issues
                    setTimeout(() => {
                        console.log('🤖 AI thinking...')

                        if (gameCopy.isGameOver()) {
                            console.log('❌ AI: Game already over')
                            setIsAIThinking(false)
                            return
                        }

                        const moves = gameCopy.moves({ verbose: true })
                        console.log(`🤖 AI: ${moves.length} moves available`)

                        if (moves.length === 0) {
                            console.log('❌ AI: No moves')
                            setIsAIThinking(false)
                            return
                        }

                        // Simple AI: prefer checks > captures > random
                        let selectedMove
                        const captures = moves.filter(m => m.captured)
                        const checks = moves.filter(m => {
                            const test = new Chess(gameCopy.fen())
                            test.move(m)
                            return test.isCheck()
                        })

                        if (checks.length > 0 && Math.random() > 0.5) {
                            selectedMove = checks[Math.floor(Math.random() * checks.length)]
                        } else if (captures.length > 0 && Math.random() > 0.3) {
                            selectedMove = captures[Math.floor(Math.random() * captures.length)]
                        } else {
                            selectedMove = moves[Math.floor(Math.random() * moves.length)]
                        }

                        console.log(`🤖 AI plays: ${selectedMove.san}`)

                        // Apply AI move
                        const aiGameCopy = new Chess(gameCopy.fen())
                        aiGameCopy.move(selectedMove)

                        setGame(aiGameCopy)
                        setLastMove({ from: selectedMove.from, to: selectedMove.to })
                        setMoveHistory(prev => [...prev, selectedMove])
                        updateBoard(aiGameCopy)
                        setIsAIThinking(false)

                        if (aiGameCopy.isGameOver()) {
                            setGameOver(true)
                            const winner = aiGameCopy.turn() === 'w' ? 'black' : 'white'
                            const gameResult = aiGameCopy.isCheckmate()
                                ? { type: 'checkmate', winner }
                                : { type: 'draw' }
                            setResult(gameResult)
                            onGameEnd?.(gameResult)
                        }
                    }, 600)
                }
                return true
            }
        } catch (e) {
            console.error('Move error:', e)
        }
        return false
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, vsAI, updateBoard, handleGameOver, onGameEnd])

    // DRAG AND DROP HANDLERS
    const handleDragStart = useCallback((e, square, piece) => {
        if (!game || gameOver || isAIThinking) return
        if (!piece || piece[0] !== game.turn()) return

        e.preventDefault()
        const moves = game.moves({ square, verbose: true })
        setDragging({ square, piece })
        setValidMoves(moves.map(m => m.to))
        setSelected(square)

        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        setDragPos({ x: clientX, y: clientY })
    }, [game, gameOver, isAIThinking])

    const handleDragMove = useCallback((e) => {
        if (!dragging) return
        e.preventDefault()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        setDragPos({ x: clientX, y: clientY })
    }, [dragging])

    const handleDragEnd = useCallback((e) => {
        if (!dragging || !boardRef.current) {
            setDragging(null)
            return
        }

        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY

        const rect = boardRef.current.getBoundingClientRect()
        const squareSize = rect.width / 8
        const file = Math.floor((clientX - rect.left) / squareSize)
        const rank = Math.floor((clientY - rect.top) / squareSize)

        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
            const targetSquare = FILES[file] + RANKS[rank]
            if (validMoves.includes(targetSquare)) {
                makeMove(dragging.square, targetSquare)
            }
        }

        setDragging(null)
        setValidMoves([])
        setSelected(null)
    }, [dragging, validMoves, makeMove])

    // Click handler for click-to-move
    const handleSquareClick = useCallback((square) => {
        if (!game || gameOver || isAIThinking || dragging) return

        const piece = game.get(square)

        if (piece && piece.color === game.turn()) {
            setSelected(square)
            const moves = game.moves({ square, verbose: true })
            setValidMoves(moves.map(m => m.to))
            return
        }

        if (selected && validMoves.includes(square)) {
            makeMove(selected, square)
        } else {
            setSelected(null)
            setValidMoves([])
        }
    }, [game, selected, validMoves, gameOver, isAIThinking, dragging, makeMove])

    const makeAIMove = useCallback((gameState) => {
        // Use passed gameState or fall back to current game state
        const currentGame = gameState || game

        console.log('🤖 AI makeAIMove called')

        if (!currentGame) {
            console.log('❌ AI: No game instance')
            setIsAIThinking(false)
            return
        }

        if (currentGame.isGameOver()) {
            console.log('❌ AI: Game is over')
            setIsAIThinking(false)
            return
        }

        const moves = currentGame.moves({ verbose: true })
        console.log(`🤖 AI: ${moves.length} moves available`)

        if (moves.length === 0) {
            console.log('❌ AI: No moves available')
            setIsAIThinking(false)
            return
        }

        // AI logic with logging
        let selectedMove
        const captures = moves.filter(m => m.captured)
        const checks = moves.filter(m => {
            const test = new Chess(currentGame.fen())
            test.move(m)
            return test.isCheck()
        })

        console.log(`🤖 AI: ${captures.length} captures, ${checks.length} checks available`)

        if (checks.length > 0 && Math.random() > 0.5) {
            selectedMove = checks[Math.floor(Math.random() * checks.length)]
            console.log('🤖 AI: Selected check move')
        } else if (captures.length > 0 && Math.random() > 0.3) {
            selectedMove = captures[Math.floor(Math.random() * captures.length)]
            console.log('🤖 AI: Selected capture move')
        } else {
            selectedMove = moves[Math.floor(Math.random() * moves.length)]
            console.log('🤖 AI: Selected random move')
        }

        console.log(`🤖 AI: Playing ${selectedMove.san} (${selectedMove.from} → ${selectedMove.to})`)

        // Create a new Chess instance for proper React state update
        const gameCopy = new Chess(currentGame.fen())
        gameCopy.move(selectedMove)
        setGame(gameCopy)
        setLastMove({ from: selectedMove.from, to: selectedMove.to })
        setMoveHistory(prev => [...prev, selectedMove])
        updateBoard(gameCopy)
        setIsAIThinking(false)

        if (gameCopy.isGameOver()) {
            console.log('🤖 AI: Game ended after AI move')
            handleGameOver()
        }
    }, [game, updateBoard, handleGameOver])


    const resetGame = useCallback(() => {
        const chess = new Chess()
        setGame(chess)
        updateBoard(chess)
        setSelected(null)
        setValidMoves([])
        setGameOver(false)
        setResult(null)
        setLastMove(null)
        setMoveHistory([])
        setIsAIThinking(false)
        setDragging(null)
    }, [updateBoard])

    const getSquareStyle = (sq) => {
        const isSelected = selected === sq.square
        const isValidMove = validMoves.includes(sq.square)
        const isLastMove = lastMove && (lastMove.from === sq.square || lastMove.to === sq.square)
        const isCheck = game?.isCheck() && sq.piece && sq.piece[1] === 'k' && sq.piece[0] === game.turn()

        let bg = sq.isLight ? '#ebecd0' : '#779556'
        if (isLastMove) bg = sq.isLight ? '#f7f783' : '#bbcc44'
        if (isSelected) bg = '#ffff00'
        if (isCheck) bg = '#ff6b6b'

        return { background: bg, position: 'relative', cursor: 'pointer' }
    }

    // Add global event listeners for drag
    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleDragMove)
            window.addEventListener('mouseup', handleDragEnd)
            window.addEventListener('touchmove', handleDragMove, { passive: false })
            window.addEventListener('touchend', handleDragEnd)
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
            window.removeEventListener('touchmove', handleDragMove)
            window.removeEventListener('touchend', handleDragEnd)
        }
    }, [dragging, handleDragMove, handleDragEnd])

    if (!game) return <div style={{ color: 'white', textAlign: 'center' }}>Cargando...</div>

    return (
        <div className="chess-container">
            {/* Header */}
            <div className="chess-header">
                <button onClick={onBack} className="back-btn">← Volver</button>
                <div className="status">
                    {gameOver ? (
                        result?.type === 'checkmate'
                            ? `🏆 ${result.winner === 'white' ? 'Blancas' : 'Negras'} ganan!`
                            : '🤝 Empate'
                    ) : isAIThinking
                        ? '🤔 IA pensando...'
                        : game.turn() === 'w' ? '⚪ Tu turno' : '⚫ Turno IA'
                    }
                </div>
                {betAmount > 0 && (
                    <div className="bet-display">💰 {betAmount} CHESS</div>
                )}
            </div>

            {/* Board */}
            <div
                className="chess-board"
                ref={boardRef}
                onMouseLeave={() => dragging && handleDragEnd({ clientX: 0, clientY: 0 })}
            >
                {board.map((sq) => (
                    <div
                        key={sq.square}
                        className="square"
                        style={getSquareStyle(sq)}
                        onClick={() => handleSquareClick(sq.square)}
                        onMouseDown={(e) => sq.piece && handleDragStart(e, sq.square, sq.piece)}
                        onTouchStart={(e) => sq.piece && handleDragStart(e, sq.square, sq.piece)}
                    >
                        {sq.piece && !((dragging?.square === sq.square)) && (
                            <span className={`piece ${sq.piece[0] === 'w' ? 'white' : 'black'}`}>
                                {PIECES[sq.piece]}
                            </span>
                        )}
                        {validMoves.includes(sq.square) && (
                            <div className={`move-indicator ${sq.piece ? 'capture' : ''}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Dragging piece */}
            {dragging && (
                <div
                    className="dragging-piece"
                    style={{
                        left: dragPos.x - 30,
                        top: dragPos.y - 30,
                    }}
                >
                    <span className={`piece ${dragging.piece[0] === 'w' ? 'white' : 'black'}`}>
                        {PIECES[dragging.piece]}
                    </span>
                </div>
            )}

            {/* Controls */}
            <div className="chess-controls">
                <button onClick={resetGame} className="new-game-btn">
                    🔄 Nueva Partida
                </button>
            </div>

            {/* Move History */}
            <div className="move-history">
                <div className="history-title">Movimientos</div>
                <div className="moves">
                    {moveHistory.length === 0
                        ? <span className="no-moves">Sin movimientos</span>
                        : moveHistory.map((m, i) => (
                            <span key={i} className={i % 2 === 0 ? 'white-move' : 'black-move'}>
                                {i % 2 === 0 && <span className="num">{Math.floor(i / 2) + 1}.</span>}
                                {m.san}
                            </span>
                        ))
                    }
                </div>
            </div>

            {/* Game Over Modal */}
            {gameOver && (
                <div className="game-over-overlay">
                    <div className="game-over-modal">
                        <div className="result-icon">{result?.type === 'checkmate' ? '👑' : '🤝'}</div>
                        <h2>{result?.type === 'checkmate'
                            ? `¡${result.winner === 'white' ? 'Ganaste' : 'La IA ganó'}!`
                            : '¡Empate!'
                        }</h2>
                        {betAmount > 0 && result?.winner === 'white' && (
                            <p className="winnings">+{betAmount * 2} CHESS</p>
                        )}
                        <button onClick={resetGame}>Jugar de Nuevo</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .chess-container {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 16px;
                    color: #F8FAFC;
                    user-select: none;
                    font-family: 'Inter', sans-serif;
                }

                .chess-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    gap: 12px;
                    flex-wrap: wrap;
                    background: rgba(11, 18, 33, 0.8);
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(45, 226, 230, 0.2);
                    backdrop-filter: blur(10px);
                }

                .back-btn {
                    padding: 8px 16px;
                    background: transparent;
                    color: #2DE2E6;
                    border: 1px solid rgba(45, 226, 230, 0.4);
                    border-radius: 25px;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 12px;
                    transition: all 0.3s ease;
                }

                .back-btn:hover {
                    background: rgba(45, 226, 230, 0.1);
                    box-shadow: 0 0 15px rgba(45, 226, 230, 0.3);
                }

                .status { 
                    font-size: 14px; 
                    font-weight: 600; 
                    font-family: 'Orbitron', sans-serif;
                    color: #F8FAFC;
                    text-shadow: 0 0 10px rgba(45, 226, 230, 0.3);
                }

                .bet-display {
                    background: linear-gradient(135deg, #D4AF37, #B8860B);
                    padding: 6px 12px;
                    border-radius: 25px;
                    font-weight: 600;
                    font-size: 12px;
                    color: #020617;
                    font-family: 'Orbitron', sans-serif;
                    box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
                }

                .chess-board {
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    aspect-ratio: 1;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 0 30px rgba(45, 226, 230, 0.2), 0 8px 32px rgba(0,0,0,0.5);
                    touch-action: none;
                    border: 2px solid rgba(45, 226, 230, 0.3);
                }

                .square {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .piece {
                    font-size: clamp(32px, 8vw, 48px);
                    line-height: 1;
                    cursor: grab;
                    transition: transform 0.1s;
                }

                .piece:active { cursor: grabbing; }

                .piece.white {
                    color: #fff;
                    text-shadow: 0 0 3px #000, 0 0 3px #000;
                }

                .piece.black { color: #000; }

                .move-indicator {
                    position: absolute;
                    width: 30%;
                    height: 30%;
                    border-radius: 50%;
                    background: rgba(45, 226, 230, 0.5);
                    pointer-events: none;
                    box-shadow: 0 0 10px rgba(45, 226, 230, 0.5);
                }

                .move-indicator.capture {
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    border: 5px solid rgba(212, 175, 55, 0.6);
                    border-radius: 50%;
                    box-sizing: border-box;
                }

                .dragging-piece {
                    position: fixed;
                    pointer-events: none;
                    z-index: 1000;
                    font-size: 60px;
                    transform: scale(1.2);
                    opacity: 0.9;
                }

                .chess-controls { margin-top: 16px; }

                .new-game-btn {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
                    color: #020617;
                    border: none;
                    border-radius: 25px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    box-shadow: 0 0 20px rgba(45, 226, 230, 0.3);
                    transition: all 0.3s ease;
                }

                .new-game-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 30px rgba(45, 226, 230, 0.5);
                }

                .move-history {
                    margin-top: 16px;
                    background: rgba(11, 18, 33, 0.8);
                    border-radius: 12px;
                    padding: 12px;
                    max-height: 100px;
                    overflow-y: auto;
                    border: 1px solid rgba(45, 226, 230, 0.2);
                    backdrop-filter: blur(10px);
                }

                .history-title {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #94A3B8;
                    margin-bottom: 8px;
                    font-family: 'Orbitron', sans-serif;
                    letter-spacing: 0.1em;
                }

                .moves { display: flex; flex-wrap: wrap; gap: 4px; }
                .no-moves { color: #64748B; font-size: 14px; }

                .white-move, .black-move {
                    font-family: 'Roboto Mono', monospace;
                    font-size: 13px;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .white-move { 
                    background: rgba(45, 226, 230, 0.15); 
                    color: #2DE2E6;
                }
                .black-move { 
                    background: rgba(125, 42, 232, 0.15); 
                    color: #A78BFA;
                }
                .num { color: #64748B; margin-right: 2px; }

                .game-over-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(2, 6, 23, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }

                .game-over-modal {
                    background: linear-gradient(135deg, #0B1221, #020617);
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    border: 1px solid rgba(45, 226, 230, 0.3);
                    box-shadow: 0 0 50px rgba(45, 226, 230, 0.2);
                }

                .result-icon { font-size: 64px; margin-bottom: 16px; }
                .game-over-modal h2 { 
                    margin: 0 0 16px; 
                    font-family: 'Orbitron', sans-serif;
                    color: #F8FAFC;
                }

                .winnings {
                    color: #D4AF37;
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 16px;
                    font-family: 'Orbitron', sans-serif;
                    text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
                }

                .game-over-modal button {
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
                    color: #020617;
                    border: none;
                    border-radius: 25px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                    text-transform: uppercase;
                    box-shadow: 0 0 20px rgba(45, 226, 230, 0.3);
                    transition: all 0.3s ease;
                }

                .game-over-modal button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 30px rgba(45, 226, 230, 0.5);
                }
                }
            `}</style>
        </div>
    )
}
