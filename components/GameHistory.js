'use client'

import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'

/**
 * GameHistory - Show player's saved games with replay capability
 */
export default function GameHistory({ onBack, walletAddress }) {
    const [games, setGames] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedGame, setSelectedGame] = useState(null)
    const [replayIndex, setReplayIndex] = useState(0)

    useEffect(() => {
        loadGames()
    }, [walletAddress])

    const loadGames = async () => {
        try {
            setLoading(true)
            const url = walletAddress
                ? `/api/games?player=${walletAddress}&status=completed`
                : '/api/games?status=completed'
            const res = await fetch(url)
            const data = await res.json()
            setGames(data.games || [])
        } catch (error) {
            console.error('Error loading game history:', error)
            // Demo data
            setGames([
                {
                    id: 'hist_1',
                    type: 'ai',
                    title: 'vs Computadora (Medio)',
                    status: 'completed',
                    result: 'win',
                    winner: 'player',
                    moves: [
                        { san: 'e4' }, { san: 'e5' }, { san: 'Nf3' }, { san: 'Nc6' },
                        { san: 'Bb5' }, { san: 'a6' }, { san: 'Ba4' }, { san: 'Nf6' }
                    ],
                    createdAt: new Date(Date.now() - 3600000),
                    endedAt: new Date()
                },
                {
                    id: 'hist_2',
                    type: 'pvp',
                    title: 'vs GrandMaster_Rex',
                    status: 'completed',
                    result: 'loss',
                    winner: 'opponent',
                    moves: [
                        { san: 'd4' }, { san: 'd5' }, { san: 'c4' }, { san: 'e6' }
                    ],
                    createdAt: new Date(Date.now() - 86400000),
                    endedAt: new Date(Date.now() - 82800000)
                },
                {
                    id: 'hist_3',
                    type: 'ai',
                    title: 'vs Computadora (Fácil)',
                    status: 'completed',
                    result: 'win',
                    winner: 'player',
                    moves: [],
                    createdAt: new Date(Date.now() - 172800000),
                    endedAt: new Date(Date.now() - 172000000)
                }
            ])
        } finally {
            setLoading(false)
        }
    }

    const selectGame = (game) => {
        setSelectedGame(game)
        setReplayIndex(0)
    }

    const getResultColor = (result) => {
        if (result === 'win') return '#48bb78'
        if (result === 'loss') return '#e53e3e'
        return '#a0aec0'
    }

    const getResultIcon = (result) => {
        if (result === 'win') return '🏆'
        if (result === 'loss') return '❌'
        return '🤝'
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Calculate stats
    const wins = games.filter(g => g.result === 'win').length
    const losses = games.filter(g => g.result === 'loss').length
    const draws = games.filter(g => g.result === 'draw').length

    if (loading) {
        return (
            <div className="history-loading">
                <div className="spinner"></div>
                <p>Cargando historial...</p>
            </div>
        )
    }

    return (
        <div className="game-history">
            {/* Header */}
            <div className="history-header">
                <button onClick={onBack} className="back-btn">← Volver</button>
                <h1>📊 Historial de Partidas</h1>
            </div>

            {/* Stats Summary */}
            <div className="stats-summary">
                <div className="stat win">
                    <span className="num">{wins}</span>
                    <span className="label">Victorias</span>
                </div>
                <div className="stat loss">
                    <span className="num">{losses}</span>
                    <span className="label">Derrotas</span>
                </div>
                <div className="stat draw">
                    <span className="num">{draws}</span>
                    <span className="label">Empates</span>
                </div>
                <div className="stat total">
                    <span className="num">{games.length}</span>
                    <span className="label">Total</span>
                </div>
            </div>

            {!selectedGame ? (
                /* Games List */
                <div className="games-list">
                    {games.length === 0 ? (
                        <div className="no-games">
                            <p>No tienes partidas guardadas</p>
                            <p>¡Juega tu primera partida!</p>
                        </div>
                    ) : (
                        games.map(game => (
                            <div
                                key={game.id}
                                className="game-item"
                                onClick={() => selectGame(game)}
                            >
                                <div
                                    className="result-indicator"
                                    style={{ backgroundColor: getResultColor(game.result) }}
                                >
                                    {getResultIcon(game.result)}
                                </div>
                                <div className="game-details">
                                    <h3>{game.title}</h3>
                                    <span className="game-type">{game.type.toUpperCase()}</span>
                                    <span className="move-count">{game.moves?.length || 0} movimientos</span>
                                </div>
                                <div className="game-date">
                                    {formatDate(game.createdAt)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Game Replay View */
                <div className="replay-view">
                    <div className="replay-header">
                        <h2>{selectedGame.title}</h2>
                        <button onClick={() => setSelectedGame(null)}>✕ Cerrar</button>
                    </div>

                    <div className="replay-content">
                        <div className="replay-board">
                            <Chessboard
                                position={selectedGame.fen || 'start'}
                                boardWidth={350}
                                arePiecesDraggable={false}
                            />
                        </div>

                        <div className="replay-moves">
                            <h3>Movimientos</h3>
                            <div className="moves-list">
                                {(selectedGame.moves || []).map((move, idx) => (
                                    <span
                                        key={idx}
                                        className={`move ${idx === replayIndex ? 'current' : ''}`}
                                        onClick={() => setReplayIndex(idx)}
                                    >
                                        {idx % 2 === 0 && <span className="num">{Math.floor(idx / 2) + 1}.</span>}
                                        {move.san}
                                    </span>
                                ))}
                            </div>

                            <div className="replay-controls">
                                <button onClick={() => setReplayIndex(0)}>⏮️</button>
                                <button onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}>◀️</button>
                                <button onClick={() => setReplayIndex(Math.min((selectedGame.moves?.length || 1) - 1, replayIndex + 1))}>▶️</button>
                                <button onClick={() => setReplayIndex((selectedGame.moves?.length || 1) - 1)}>⏭️</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .game-history {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    padding: 20px;
                }
                
                .history-header {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .history-header h1 {
                    margin: 0;
                    font-size: 28px;
                }
                
                .back-btn {
                    padding: 10px 20px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                
                .stats-summary {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 15px 30px;
                    text-align: center;
                }
                
                .stat .num {
                    display: block;
                    font-size: 32px;
                    font-weight: bold;
                }
                
                .stat .label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                    text-transform: uppercase;
                }
                
                .stat.win .num { color: #48bb78; }
                .stat.loss .num { color: #e53e3e; }
                .stat.draw .num { color: #a0aec0; }
                .stat.total .num { color: #fbbf24; }
                
                .games-list {
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                .game-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .game-item:hover {
                    background: rgba(255,255,255,0.1);
                    transform: translateX(5px);
                }
                
                .result-indicator {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .game-details {
                    flex: 1;
                }
                
                .game-details h3 {
                    margin: 0 0 5px;
                    font-size: 16px;
                }
                
                .game-type, .move-count {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                    margin-right: 10px;
                }
                
                .game-date {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                }
                
                .no-games {
                    text-align: center;
                    padding: 40px;
                    color: rgba(255,255,255,0.6);
                }
                
                .replay-view {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .replay-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .replay-header h2 {
                    margin: 0;
                }
                
                .replay-header button {
                    padding: 8px 16px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
                
                .replay-content {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 30px;
                }
                
                .replay-moves h3 {
                    margin: 0 0 15px;
                }
                
                .moves-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 10px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                }
                
                .moves-list .move {
                    padding: 4px 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    font-family: monospace;
                    cursor: pointer;
                }
                
                .moves-list .move.current {
                    background: #667eea;
                }
                
                .moves-list .num {
                    color: #fbbf24;
                    margin-right: 3px;
                }
                
                .replay-controls {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                .replay-controls button {
                    width: 50px;
                    height: 40px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    border-radius: 6px;
                    font-size: 18px;
                    cursor: pointer;
                }
                
                .replay-controls button:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                .history-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 50vh;
                    color: white;
                }
                
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.2);
                    border-top-color: #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .replay-content {
                        grid-template-columns: 1fr;
                    }
                    
                    .stats-summary {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    )
}
