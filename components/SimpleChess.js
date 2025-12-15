'use client'

import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'

/**
 * SimpleChess - Minimal working chess component
 */
export default function SimpleChess({ onBack }) {
    const [game] = useState(new Chess())
    const [position, setPosition] = useState('start')

    function onDrop(sourceSquare, targetSquare) {
        console.log('Move attempt:', sourceSquare, '->', targetSquare)

        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q'
            })

            if (move) {
                console.log('Move successful:', move.san)
                setPosition(game.fen())
                return true
            }
        } catch (e) {
            console.log('Invalid move:', e.message)
        }
        return false
    }

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <div style={{
                background: '#1a1a2e',
                padding: 20,
                borderRadius: 12,
                color: 'white'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20
                }}>
                    <button
                        onClick={onBack}
                        style={{
                            padding: '10px 20px',
                            background: '#4a5568',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer'
                        }}
                    >
                        ← Volver
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 600 }}>
                        {game.turn() === 'w' ? '⚪ Turno Blancas' : '⚫ Turno Negras'}
                    </span>
                </div>

                <Chessboard
                    position={position}
                    onPieceDrop={onDrop}
                    boardOrientation="white"
                    arePiecesDraggable={true}
                />

                <button
                    onClick={() => {
                        game.reset()
                        setPosition('start')
                    }}
                    style={{
                        width: '100%',
                        marginTop: 20,
                        padding: '12px',
                        background: '#48bb78',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    🔄 Nueva Partida
                </button>
            </div>
        </div>
    )
}
