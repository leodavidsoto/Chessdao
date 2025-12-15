'use client'

import { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'

const PIECES = {
    'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚'
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

// Puzzle database
const PUZZLES = {
    easy: [
        { id: 'e1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['Qxf7#'], title: 'Mate del Pastor', rating: 600 },
        { id: 'e2', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', solution: ['Re8#'], title: 'Mate de Corredor', rating: 700 },
        { id: 'e3', fen: 'k7/8/1K6/8/8/8/8/1R6 w - - 0 1', solution: ['Ra1#'], title: 'Mate con Torre', rating: 500 }
    ],
    medium: [
        { id: 'm1', fen: 'r1b1kb1r/pppp1ppp/2n2n2/4N2Q/2B1q3/8/PPPP1PPP/RNB1K2R w KQkq - 0 1', solution: ['Nxf7', 'Qxf7', 'Qxf7#'], title: 'Sacrificio de Caballo', rating: 1200 },
        { id: 'm2', fen: '5rk1/1p3ppp/pq6/8/8/1P2Q3/P4PPP/5RK1 w - - 0 1', solution: ['Qe8', 'Rxe8', 'Rxe8#'], title: 'Mate en la Octava', rating: 1300 }
    ],
    hard: [
        { id: 'h1', fen: 'r1b1r1k1/1pqn1pbp/p2p2p1/2pP4/P1P1N3/2N1BP2/1P1QB1PP/R4RK1 w - - 0 1', solution: ['Nf6+', 'Bxf6', 'Qxh7+'], title: 'Ataque Griego', rating: 1800 }
    ]
}

export default function DailyPuzzles({ onBack }) {
    const [game, setGame] = useState(null)
    const [board, setBoard] = useState([])
    const [selected, setSelected] = useState(null)
    const [validMoves, setValidMoves] = useState([])
    const [puzzle, setPuzzle] = useState(null)
    const [moveIndex, setMoveIndex] = useState(0)
    const [solved, setSolved] = useState(false)
    const [failed, setFailed] = useState(false)
    const [attempts, setAttempts] = useState(0)
    const [streak, setStreak] = useState(0)
    const [difficulty, setDifficulty] = useState('easy')
    const [playerMoves, setPlayerMoves] = useState([])
    const [lastMove, setLastMove] = useState(null)
    const boardRef = useRef(null)

    // Update board from chess instance
    const updateBoard = (chess) => {
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
    }

    // Load a new puzzle
    const loadPuzzle = (diff = difficulty) => {
        const puzzles = PUZZLES[diff]
        const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)]

        console.log('Loading puzzle:', randomPuzzle.title, 'FEN:', randomPuzzle.fen)

        const newGame = new Chess(randomPuzzle.fen)
        setGame(newGame)
        setPuzzle(randomPuzzle)
        updateBoard(newGame)

        // Reset state
        setSelected(null)
        setValidMoves([])
        setMoveIndex(0)
        setSolved(false)
        setFailed(false)
        setAttempts(0)
        setPlayerMoves([])
        setLastMove(null)
    }

    // Initialize on mount
    useEffect(() => {
        loadPuzzle()
    }, [])

    // Handle square click
    const handleSquareClick = (square) => {
        if (solved || failed || !game || !puzzle) return

        const piece = game.get(square)

        // If clicking own piece, select it
        if (piece && piece.color === game.turn()) {
            setSelected(square)
            const moves = game.moves({ square, verbose: true })
            setValidMoves(moves.map(m => m.to))
            return
        }

        // If a piece is selected and clicking valid move
        if (selected && validMoves.includes(square)) {
            makeMove(selected, square)
        } else {
            setSelected(null)
            setValidMoves([])
        }
    }

    // Make a move
    const makeMove = (from, to) => {
        const gameCopy = new Chess(game.fen())
        const move = gameCopy.move({ from, to, promotion: 'q' })

        if (!move) return

        const expectedMove = puzzle.solution[moveIndex]
        const moveMatches = move.san === expectedMove ||
            move.san.replace(/[+#]/g, '') === expectedMove.replace(/[+#]/g, '')

        if (moveMatches) {
            // Correct move
            setGame(gameCopy)
            updateBoard(gameCopy)
            setLastMove({ from, to })
            setPlayerMoves(prev => [...prev, move.san])
            setSelected(null)
            setValidMoves([])

            const nextMoveIndex = moveIndex + 1

            if (nextMoveIndex >= puzzle.solution.length) {
                // Puzzle solved!
                setSolved(true)
                setStreak(prev => prev + 1)
            } else {
                setMoveIndex(nextMoveIndex)

                // AI response
                setTimeout(() => {
                    const aiMove = puzzle.solution[nextMoveIndex]
                    try {
                        const aiGameCopy = new Chess(gameCopy.fen())
                        const aiResult = aiGameCopy.move(aiMove)
                        if (aiResult) {
                            setGame(aiGameCopy)
                            updateBoard(aiGameCopy)
                            setLastMove({ from: aiResult.from, to: aiResult.to })
                            setPlayerMoves(prev => [...prev, aiResult.san])
                            setMoveIndex(nextMoveIndex + 1)
                        }
                    } catch (e) {
                        console.error('AI move error:', e)
                    }
                }, 500)
            }
        } else {
            // Wrong move
            setAttempts(prev => prev + 1)
            if (attempts >= 2) {
                setFailed(true)
                setStreak(0)
            }
        }
    }

    const changeDifficulty = (diff) => {
        setDifficulty(diff)
        loadPuzzle(diff)
    }

    return (
        <div className="puzzle-container">
            {/* Header */}
            <div className="puzzle-header">
                <button onClick={onBack} className="back-btn">← Volver</button>
                <h1>🧩 Puzzles Diarios</h1>
                <div className="streak">🔥 Racha: {streak}</div>
            </div>

            <div className="puzzle-main">
                {/* Board */}
                <div className="board-section">
                    <div className="puzzle-info">
                        <h2>{puzzle?.title}</h2>
                        <p>⭐ {puzzle?.rating}</p>
                    </div>

                    <div className="board" ref={boardRef}>
                        {board.map((sq, idx) => (
                            <div
                                key={idx}
                                className={`square ${sq.isLight ? 'light' : 'dark'}
                                    ${selected === sq.square ? 'selected' : ''}
                                    ${validMoves.includes(sq.square) ? 'valid-move' : ''}
                                    ${lastMove?.from === sq.square || lastMove?.to === sq.square ? 'last-move' : ''}`}
                                onClick={() => handleSquareClick(sq.square)}
                            >
                                {sq.piece && (
                                    <span className={`piece ${sq.piece[0] === 'w' ? 'white' : 'black'}`}>
                                        {PIECES[sq.piece]}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Status */}
                    {solved && (
                        <div className="status success">
                            ✅ ¡Correcto!
                            <button onClick={() => loadPuzzle()}>Siguiente →</button>
                        </div>
                    )}
                    {failed && (
                        <div className="status failed">
                            ❌ Fallaste
                            <button onClick={() => loadPuzzle()}>Reintentar</button>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="controls">
                    <div className="control-card">
                        <h3>Dificultad</h3>
                        <div className="diff-buttons">
                            {['easy', 'medium', 'hard'].map(diff => (
                                <button
                                    key={diff}
                                    className={difficulty === diff ? 'active' : ''}
                                    onClick={() => changeDifficulty(diff)}
                                >
                                    {diff === 'easy' ? '😊 Fácil' : diff === 'medium' ? '🙂 Medio' : '😤 Difícil'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="control-card">
                        <h3>Tus Jugadas</h3>
                        <div className="moves-list">
                            {playerMoves.length === 0 ? (
                                <p className="hint">Haz tu primera jugada...</p>
                            ) : (
                                playerMoves.map((m, i) => <span key={i} className="move">{m}</span>)
                            )}
                        </div>
                    </div>

                    <div className="control-card">
                        <h3>Estadísticas</h3>
                        <p>Intentos: {attempts}/3</p>
                        <p>Movimiento: {moveIndex + 1}/{puzzle?.solution.length || 0}</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .puzzle-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0B1221 0%, #020617 100%);
                    color: white;
                    padding: 20px;
                }
                .puzzle-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .puzzle-header h1 {
                    font-family: 'Orbitron', sans-serif;
                    background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin: 0;
                }
                .back-btn {
                    padding: 10px 20px;
                    background: rgba(45, 226, 230, 0.1);
                    border: 1px solid #2DE2E6;
                    color: #2DE2E6;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .streak {
                    background: linear-gradient(135deg, #D4AF37, #F59E0B);
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                }
                .puzzle-main {
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 30px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .board-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .puzzle-info {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .puzzle-info h2 { margin: 0 0 8px; }
                .puzzle-info p { margin: 0; color: #64748B; }
                .board {
                    display: grid;
                    grid-template-columns: repeat(8, 50px);
                    grid-template-rows: repeat(8, 50px);
                    border: 4px solid #2DE2E6;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 0 30px rgba(45, 226, 230, 0.3);
                }
                .square {
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                }
                .square.light { background: #E8D5B7; }
                .square.dark { background: #B88B5D; }
                .square.selected { background: rgba(45, 226, 230, 0.5) !important; }
                .square.valid-move::after {
                    content: '';
                    width: 16px;
                    height: 16px;
                    background: rgba(45, 226, 230, 0.6);
                    border-radius: 50%;
                    position: absolute;
                }
                .square.last-move { background: rgba(212, 175, 55, 0.4) !important; }
                .piece {
                    font-size: 36px;
                    user-select: none;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                    line-height: 1;
                }
                .piece.white { color: #FFFFFF; }
                .piece.black { color: #1a1a2e; }
                .status {
                    margin-top: 20px;
                    padding: 15px 30px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    font-weight: bold;
                }
                .status.success {
                    background: rgba(72, 187, 120, 0.2);
                    border: 1px solid #48BB78;
                }
                .status.failed {
                    background: rgba(229, 62, 62, 0.2);
                    border: 1px solid #E53E3E;
                }
                .status button {
                    padding: 8px 16px;
                    background: #2DE2E6;
                    border: none;
                    border-radius: 6px;
                    color: #020617;
                    font-weight: bold;
                    cursor: pointer;
                }
                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .control-card {
                    background: rgba(11, 18, 33, 0.8);
                    border: 1px solid rgba(45, 226, 230, 0.2);
                    border-radius: 12px;
                    padding: 16px;
                }
                .control-card h3 {
                    margin: 0 0 12px;
                    font-size: 14px;
                    color: #94A3B8;
                }
                .diff-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .diff-buttons button {
                    padding: 10px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid transparent;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .diff-buttons button.active {
                    border-color: #2DE2E6;
                    background: rgba(45, 226, 230, 0.1);
                }
                .moves-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .move {
                    padding: 4px 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    font-family: monospace;
                }
                .hint { color: #64748B; margin: 0; font-size: 14px; }
                @media (max-width: 800px) {
                    .puzzle-main { grid-template-columns: 1fr; }
                    .board { width: 100%; max-width: 400px; height: auto; }
                }
            `}</style>
        </div>
    )
}
