'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Chess } from 'chess.js'

// Cargar Chessboard dinámicamente sin SSR
const Chessboard = dynamic(
    () => import('react-chessboard').then(mod => mod.Chessboard),
    { ssr: false, loading: () => <div style={{ width: '100%', aspectRatio: 1, background: '#374151', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Cargando tablero...</div> }
)

export default function WorkingChess({ onBack }) {
    const [mounted, setMounted] = useState(false)
    const [game, setGame] = useState(null)
    const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    const [status, setStatus] = useState('Tu turno')

    useEffect(() => {
        setMounted(true)
        setGame(new Chess())
    }, [])

    function handleMove(source, target) {
        if (!game) return false

        try {
            const move = game.move({
                from: source,
                to: target,
                promotion: 'q'
            })

            if (move) {
                setFen(game.fen())

                if (game.isGameOver()) {
                    if (game.isCheckmate()) {
                        setStatus('¡Jaque Mate!')
                    } else {
                        setStatus('Empate')
                    }
                } else {
                    setStatus(game.turn() === 'w' ? 'Turno Blancas' : 'Turno Negras')

                    // AI move after 500ms
                    setTimeout(() => {
                        const moves = game.moves()
                        if (moves.length > 0) {
                            const randomMove = moves[Math.floor(Math.random() * moves.length)]
                            game.move(randomMove)
                            setFen(game.fen())
                            setStatus(game.turn() === 'w' ? 'Tu turno' : 'Turno Negras')
                        }
                    }, 500)
                }
                return true
            }
        } catch (e) {
            console.error('Move error:', e)
        }
        return false
    }

    function resetGame() {
        const newGame = new Chess()
        setGame(newGame)
        setFen(newGame.fen())
        setStatus('Tu turno')
    }

    if (!mounted) {
        return <div style={{ color: 'white', textAlign: 'center', padding: 40 }}>Cargando...</div>
    }

    return (
        <div style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: 20,
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                color: 'white'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        padding: '10px 20px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer'
                    }}
                >
                    ← Volver
                </button>
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                    ♟️ {status}
                </span>
            </div>

            {/* Board */}
            <div style={{ marginBottom: 20 }}>
                <Chessboard
                    position={fen}
                    onPieceDrop={handleMove}
                    boardWidth={460}
                    arePiecesDraggable={true}
                    customBoardStyle={{
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}
                />
            </div>

            {/* Controls */}
            <button
                onClick={resetGame}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #48bb78, #38a169)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 16
                }}
            >
                🔄 Nueva Partida
            </button>
        </div>
    )
}
