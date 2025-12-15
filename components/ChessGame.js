'use client'

import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'

/**
 * ChessGame - Working chess component with AI
 */
export default function ChessGame({
    mode = 'ai',
    difficulty = 'medium',
    playerColor = 'white',
    onGameEnd,
    onMove
}) {
    // Use FEN string as the source of truth
    const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    const [gameOver, setGameOver] = useState(false)
    const [result, setResult] = useState(null)
    const [selectedSquare, setSelectedSquare] = useState(null)
    const [possibleMoves, setPossibleMoves] = useState([])
    const [lastMove, setLastMove] = useState(null)
    const [moveHistory, setMoveHistory] = useState([])
    const [isThinking, setIsThinking] = useState(false)
    const [orientation, setOrientation] = useState(playerColor)

    // Create a temporary chess instance for validation
    const getChess = () => new Chess(fen)

    // Get current turn
    const getCurrentTurn = () => {
        const chess = getChess()
        return chess.turn() === 'w' ? 'white' : 'black'
    }

    // Reset game
    const resetGame = () => {
        setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        setGameOver(false)
        setResult(null)
        setSelectedSquare(null)
        setPossibleMoves([])
        setLastMove(null)
        setMoveHistory([])
        setIsThinking(false)
    }

    // Make a move
    const makeMove = (from, to, promotion = 'q') => {
        try {
            const chess = new Chess(fen)
            const move = chess.move({ from, to, promotion })

            if (move) {
                const newFen = chess.fen()
                setFen(newFen)
                setLastMove({ from, to })
                setMoveHistory(prev => [...prev, move])
                setSelectedSquare(null)
                setPossibleMoves([])

                onMove?.(move)

                // Check game end
                if (chess.isGameOver()) {
                    setGameOver(true)
                    if (chess.isCheckmate()) {
                        const winner = chess.turn() === 'w' ? 'black' : 'white'
                        setResult({ type: 'checkmate', winner })
                        onGameEnd?.({ type: 'checkmate', winner })
                    } else {
                        setResult({ type: 'draw' })
                        onGameEnd?.({ type: 'draw' })
                    }
                }

                return { success: true, newFen }
            }
        } catch (error) {
            console.error('Move error:', error)
        }
        return { success: false }
    }

    // AI move
    const makeAIMove = () => {
        if (gameOver) return

        const chess = new Chess(fen)
        const moves = chess.moves({ verbose: true })

        if (moves.length === 0) return

        // Simple AI: pick a random move with preference for captures
        const scoredMoves = moves.map(m => ({
            move: m,
            score: m.captured ? 5 : Math.random()
        }))
        scoredMoves.sort((a, b) => b.score - a.score)

        const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length))
        const selected = topMoves[Math.floor(Math.random() * topMoves.length)]

        makeMove(selected.move.from, selected.move.to, selected.move.promotion)
    }

    // AI plays after player move
    useEffect(() => {
        if (mode !== 'ai' || gameOver || isThinking) return

        const chess = new Chess(fen)
        const currentTurn = chess.turn() === 'w' ? 'white' : 'black'
        const isAITurn = currentTurn !== playerColor

        if (isAITurn) {
            setIsThinking(true)
            const delay = difficulty === 'easy' ? 300 : difficulty === 'medium' ? 600 : 1000

            setTimeout(() => {
                makeAIMove()
                setIsThinking(false)
            }, delay)
        }
    }, [fen, mode, playerColor, gameOver, isThinking, difficulty])

    // Handle piece drop (drag and drop)
    const onDrop = (sourceSquare, targetSquare) => {
        if (gameOver || isThinking) return false

        if (mode === 'ai') {
            const chess = new Chess(fen)
            const currentTurn = chess.turn() === 'w' ? 'white' : 'black'
            if (currentTurn !== playerColor) return false
        }

        const result = makeMove(sourceSquare, targetSquare)
        return result.success
    }

    // Handle square click
    const onSquareClick = (square) => {
        if (gameOver || isThinking) return

        const chess = new Chess(fen)

        // Check if player's turn in AI mode
        if (mode === 'ai') {
            const currentTurn = chess.turn() === 'w' ? 'white' : 'black'
            if (currentTurn !== playerColor) return
        }

        // If we have a selected square and clicking on a valid move target
        if (selectedSquare && possibleMoves.includes(square)) {
            const result = makeMove(selectedSquare, square)
            if (result.success) return
        }

        // Select a piece
        const piece = chess.get(square)
        if (piece) {
            // Only select own pieces
            const pieceColor = piece.color === 'w' ? 'white' : 'black'
            if (mode === 'ai' && pieceColor !== playerColor) return

            setSelectedSquare(square)
            const moves = chess.moves({ square, verbose: true })
            setPossibleMoves(moves.map(m => m.to))
        } else {
            setSelectedSquare(null)
            setPossibleMoves([])
        }
    }

    // Get square styles
    const getSquareStyles = () => {
        const styles = {}
        const chess = new Chess(fen)

        if (selectedSquare) {
            styles[selectedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
        }

        possibleMoves.forEach(sq => {
            styles[sq] = {
                background: chess.get(sq)
                    ? 'radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.3) 60%)'
                    : 'radial-gradient(circle, rgba(0, 0, 0, 0.2) 25%, transparent 25%)'
            }
        })

        if (lastMove) {
            styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: 'rgba(155, 199, 0, 0.4)' }
            styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: 'rgba(155, 199, 0, 0.5)' }
        }

        if (chess.isCheck()) {
            const turn = chess.turn()
            const board = chess.board()
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const p = board[i][j]
                    if (p && p.type === 'k' && p.color === turn) {
                        const sq = 'abcdefgh'[j] + (8 - i)
                        styles[sq] = { ...styles[sq], backgroundColor: 'rgba(255, 0, 0, 0.5)' }
                    }
                }
            }
        }

        return styles
    }

    // Get turn text
    const getTurnText = () => {
        if (gameOver) {
            return result?.type === 'checkmate'
                ? `♔ ${result.winner === 'white' ? 'Blancas' : 'Negras'} ganan!`
                : '⚖️ Empate'
        }
        if (isThinking) return '🤔 IA pensando...'
        const chess = new Chess(fen)
        return chess.turn() === 'w' ? '⚪ Turno de Blancas' : '⚫ Turno de Negras'
    }

    const chess = new Chess(fen)

    return (
        <div className="chess-game">
            <div className="chess-status">
                <span className={gameOver ? 'game-over' : ''}>{getTurnText()}</span>
                {chess.isCheck() && !gameOver && <span className="check">¡JAQUE!</span>}
            </div>

            <div className="chess-board">
                <Chessboard
                    position={fen}
                    onPieceDrop={onDrop}
                    onSquareClick={onSquareClick}
                    boardOrientation={orientation}
                    customSquareStyles={getSquareStyles()}
                    arePiecesDraggable={!gameOver && !isThinking}
                    animationDuration={200}
                    customBoardStyle={{
                        borderRadius: '4px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                    }}
                    customDarkSquareStyle={{ backgroundColor: '#779556' }}
                    customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
                />
            </div>

            <div className="chess-controls">
                <button onClick={resetGame}>🔄 Nueva Partida</button>
                <button onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}>
                    🔃 Girar Tablero
                </button>
            </div>

            <div className="move-history">
                <div className="title">Movimientos</div>
                <div className="moves">
                    {moveHistory.length === 0 ? (
                        <span className="empty">Sin movimientos</span>
                    ) : (
                        moveHistory.map((move, i) => (
                            <span key={i} className={i % 2 === 0 ? 'white' : 'black'}>
                                {i % 2 === 0 && <span className="num">{Math.floor(i / 2) + 1}.</span>}
                                {move.san}
                            </span>
                        ))
                    )}
                </div>
            </div>

            {gameOver && (
                <div className="overlay">
                    <div className="modal">
                        <div className="icon">{result?.type === 'checkmate' ? '👑' : '🤝'}</div>
                        <h2>{result?.type === 'checkmate'
                            ? `¡${result.winner === 'white' ? 'Blancas' : 'Negras'} Ganan!`
                            : '¡Empate!'}</h2>
                        <button onClick={resetGame}>Jugar de Nuevo</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .chess-game {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    max-width: 600px;
                    margin: 0 auto;
                }
                .chess-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #2d3748, #1a202c);
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 600;
                    color: white;
                }
                .game-over { color: #fbbf24; }
                .check {
                    background: #ef4444;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 14px;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .chess-board {
                    width: 100%;
                    aspect-ratio: 1;
                }
                .chess-controls {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .chess-controls button {
                    padding: 10px 20px;
                    background: #4a5568;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .chess-controls button:hover {
                    background: #718096;
                }
                .move-history {
                    background: #1a202c;
                    border-radius: 8px;
                    padding: 12px;
                    max-height: 120px;
                    overflow-y: auto;
                }
                .move-history .title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #a0aec0;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .move-history .moves {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                .move-history .empty {
                    color: #718096;
                    font-size: 14px;
                }
                .move-history .moves span {
                    font-family: monospace;
                    font-size: 14px;
                    padding: 2px 6px;
                    border-radius: 3px;
                }
                .move-history .moves .white { background: #2d3748; color: white; }
                .move-history .moves .black { background: #4a5568; color: #e2e8f0; }
                .move-history .moves .num { color: #a0aec0; margin-right: 4px; }
                .overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }
                .modal {
                    background: linear-gradient(135deg, #2d3748, #1a202c);
                    padding: 40px;
                    border-radius: 16px;
                    text-align: center;
                }
                .modal .icon { font-size: 64px; margin-bottom: 16px; }
                .modal h2 { color: white; margin: 0 0 24px; }
                .modal button {
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #48bb78, #38a169);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                }
            `}</style>
        </div>
    )
}
