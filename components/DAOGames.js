'use client'

import { useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { apiFetch } from '@/lib/config'

/**
 * DAOGames - Community voting chess games
 * Players vote on moves, most popular move is played
 */
export default function DAOGames({ onBack }) {
    const [games, setGames] = useState([])
    const [selectedGame, setSelectedGame] = useState(null)
    const [loading, setLoading] = useState(true)
    const [votes, setVotes] = useState({})
    const [myVote, setMyVote] = useState(null)
    const [chess, setChess] = useState(null)
    const [possibleMoves, setPossibleMoves] = useState([])
    const [votingTimeLeft, setVotingTimeLeft] = useState(60)

    // Load DAO games
    useEffect(() => {
        loadGames()
    }, [])

    const loadGames = async () => {
        try {
            setLoading(true)
            const res = await apiFetch('/api/games?type=dao&status=active')
            const data = await res.json()
            setGames(data.games || [])
        } catch (error) {
            console.error('Error loading DAO games:', error)
            // Demo data
            setGames([
                {
                    id: 'dao_1',
                    title: 'DAO Community Game #1',
                    status: 'voting',
                    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
                    votes: { e5: 12, c5: 8, d5: 5 },
                    moveNumber: 1,
                    participants: 25
                },
                {
                    id: 'dao_2',
                    title: 'DAO Community Game #2',
                    status: 'voting',
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                    votes: {},
                    moveNumber: 0,
                    participants: 15
                }
            ])
        } finally {
            setLoading(false)
        }
    }

    // Select a game
    const selectGame = useCallback((game) => {
        setSelectedGame(game)
        const newChess = new Chess(game.fen)
        setChess(newChess)
        setVotes(game.votes || {})
        setMyVote(null)
        setPossibleMoves(newChess.moves())
    }, [])

    // Vote for a move
    const voteForMove = async (move) => {
        if (!selectedGame || myVote) return

        setMyVote(move)
        const newVotes = { ...votes }
        newVotes[move] = (newVotes[move] || 0) + 1
        setVotes(newVotes)

        try {
            await apiFetch('/api/games', {
                method: 'PUT',
                body: JSON.stringify({
                    id: selectedGame.id,
                    votes: newVotes
                })
            })
        } catch (error) {
            console.error('Error voting:', error)
        }
    }

    // Create new DAO game
    const createDAOGame = async () => {
        try {
            const res = await apiFetch('/api/games', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'dao',
                    title: `DAO Community Game #${games.length + 1}`,
                    status: 'voting'
                })
            })
            const data = await res.json()
            if (data.success) {
                loadGames()
            }
        } catch (error) {
            console.error('Error creating DAO game:', error)
        }
    }

    // Voting timer
    useEffect(() => {
        if (!selectedGame) return
        const timer = setInterval(() => {
            setVotingTimeLeft(prev => {
                if (prev <= 1) {
                    // Execute winning move
                    return 60
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [selectedGame])

    // Get sorted votes
    const sortedVotes = Object.entries(votes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

    const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0)

    if (loading) {
        return (
            <div className="dao-loading">
                <div className="spinner"></div>
                <p>Cargando juegos DAO...</p>
            </div>
        )
    }

    return (
        <div className="dao-games">
            {/* Header */}
            <div className="dao-header">
                <button onClick={onBack} className="back-btn">← Volver</button>
                <h1>🏛️ Juegos DAO</h1>
                <button onClick={createDAOGame} className="create-btn">+ Nuevo Juego</button>
            </div>

            {!selectedGame ? (
                /* Games List */
                <div className="games-list">
                    <h2>Partidas Activas</h2>
                    {games.length === 0 ? (
                        <div className="no-games">
                            <p>No hay juegos DAO activos</p>
                            <button onClick={createDAOGame}>Crear primer juego</button>
                        </div>
                    ) : (
                        <div className="games-grid">
                            {games.map(game => (
                                <div key={game.id} className="game-card" onClick={() => selectGame(game)}>
                                    <div className="game-preview">
                                        <Chessboard
                                            position={game.fen}
                                            boardWidth={150}
                                            arePiecesDraggable={false}
                                        />
                                    </div>
                                    <div className="game-info">
                                        <h3>{game.title}</h3>
                                        <span className="participants">👥 {game.participants || 0} votantes</span>
                                        <span className="move-num">Movimiento #{game.moveNumber || 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Game View with Voting */
                <div className="game-view">
                    <div className="game-board">
                        <div className="timer">
                            ⏱️ Votación: {votingTimeLeft}s
                        </div>
                        <Chessboard
                            position={chess?.fen() || 'start'}
                            boardWidth={400}
                            arePiecesDraggable={false}
                        />
                        <button onClick={() => setSelectedGame(null)} className="exit-btn">
                            Salir del juego
                        </button>
                    </div>

                    <div className="voting-panel">
                        <h2>🗳️ Vota por el próximo movimiento</h2>

                        {/* Vote Results */}
                        <div className="vote-results">
                            {sortedVotes.map(([move, count], idx) => (
                                <div
                                    key={move}
                                    className={`vote-bar ${myVote === move ? 'my-vote' : ''}`}
                                    onClick={() => voteForMove(move)}
                                >
                                    <span className="rank">{idx + 1}</span>
                                    <span className="move">{move}</span>
                                    <div
                                        className="bar"
                                        style={{ width: `${totalVotes > 0 ? (count / totalVotes) * 100 : 0}%` }}
                                    ></div>
                                    <span className="count">{count} votos</span>
                                </div>
                            ))}
                        </div>

                        {/* Possible Moves */}
                        <div className="possible-moves">
                            <h3>Movimientos posibles:</h3>
                            <div className="moves-grid">
                                {possibleMoves.slice(0, 20).map(move => (
                                    <button
                                        key={move}
                                        className={`move-btn ${myVote === move ? 'voted' : ''}`}
                                        onClick={() => voteForMove(move)}
                                        disabled={!!myVote}
                                    >
                                        {move}
                                    </button>
                                ))}
                            </div>
                            {myVote && (
                                <p className="voted-msg">✅ Votaste por: {myVote}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .dao-games {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    padding: 20px;
                }
                
                .dao-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding: 0 10px;
                }
                
                .dao-header h1 {
                    font-size: 28px;
                    margin: 0;
                }
                
                .back-btn, .create-btn, .exit-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .back-btn {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
                
                .create-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                
                .exit-btn {
                    margin-top: 15px;
                    background: #e53e3e;
                    color: white;
                    width: 100%;
                }
                
                .games-list h2 {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .games-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .game-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-align: center;
                }
                
                .game-card:hover {
                    background: rgba(255,255,255,0.1);
                    transform: translateY(-3px);
                }
                
                .game-preview {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 10px;
                }
                
                .game-info h3 {
                    margin: 0 0 8px;
                    font-size: 16px;
                }
                
                .participants, .move-num {
                    display: block;
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                }
                
                .game-view {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .game-board {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .timer {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #fbbf24;
                }
                
                .voting-panel {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 20px;
                }
                
                .voting-panel h2 {
                    margin: 0 0 20px;
                    font-size: 20px;
                }
                
                .vote-results {
                    margin-bottom: 20px;
                }
                
                .vote-bar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                
                .vote-bar.my-vote {
                    border: 2px solid #48bb78;
                }
                
                .vote-bar .bar {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    background: rgba(102, 126, 234, 0.3);
                    z-index: 0;
                    transition: width 0.3s;
                }
                
                .vote-bar .rank, .vote-bar .move, .vote-bar .count {
                    position: relative;
                    z-index: 1;
                }
                
                .vote-bar .rank {
                    width: 25px;
                    color: #fbbf24;
                    font-weight: bold;
                }
                
                .vote-bar .move {
                    font-family: monospace;
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .vote-bar .count {
                    margin-left: auto;
                    color: rgba(255,255,255,0.6);
                }
                
                .possible-moves h3 {
                    margin: 0 0 10px;
                    font-size: 14px;
                }
                
                .moves-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                .move-btn {
                    padding: 8px 12px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                    color: white;
                    font-family: monospace;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .move-btn:hover:not(:disabled) {
                    background: rgba(102, 126, 234, 0.5);
                }
                
                .move-btn.voted {
                    background: #48bb78;
                    border-color: #48bb78;
                }
                
                .move-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .voted-msg {
                    margin-top: 15px;
                    color: #48bb78;
                    font-weight: 600;
                }
                
                .no-games {
                    text-align: center;
                    padding: 40px;
                }
                
                .no-games button {
                    margin-top: 15px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                }
                
                .dao-loading {
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
                    .game-view {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
