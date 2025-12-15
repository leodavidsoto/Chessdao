'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useGameTokens } from '@/hooks/useGameTokens'
import { apiFetch } from '@/lib/config'

const BET_AMOUNTS = [10, 25, 50, 100, 250, 500]

export default function BettingModal({
    isOpen,
    onClose,
    onStartGame,
    gameType = 'pvp' // 'pvp' or 'dao'
}) {
    const { publicKey, connected } = useWallet()
    const { gameBalance, actions } = useGameTokens()
    const [selectedBet, setSelectedBet] = useState(50)
    const [customBet, setCustomBet] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    if (!isOpen) return null

    const currentBet = customBet ? parseInt(customBet) : selectedBet
    const canAfford = gameBalance >= currentBet
    const isValid = currentBet >= 10 && canAfford

    const handleStartGame = async () => {
        if (!isValid) return

        setIsLoading(true)
        setError(null)

        try {
            // Deduct bet from $GAME balance
            const result = await actions.deductTokens(currentBet, 'bet')

            if (!result.success) {
                throw new Error(result.error || 'Failed to deduct bet')
            }

            // Log the bet transaction
            await apiFetch('/api/transactions', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey?.toString(),
                    type: gameType === 'pvp' ? 'pvp_bet' : 'dao_bet',
                    amount: currentBet,
                    token: 'GAME',
                    description: `Apuesta ${gameType.toUpperCase()}`
                })
            })

            // Start the game
            onStartGame({
                betAmount: currentBet,
                gameType,
                walletAddress: publicKey?.toString(),
                token: 'GAME'
            })

            onClose()
        } catch (err) {
            console.error('Betting error:', err)
            setError('Error al procesar la apuesta')
            // Refresh balance in case of partial failure
            actions.refreshBalance()
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}>×</button>

                <div className="modal-header">
                    <span className="icon">{gameType === 'pvp' ? '⚔️' : '🏛️'}</span>
                    <h2>{gameType === 'pvp' ? 'Partida PvP' : 'Partida DAO'}</h2>
                    <p>{gameType === 'pvp'
                        ? 'Apuesta contra otro jugador'
                        : 'Apuesta en partida comunitaria'
                    }</p>
                </div>

                <div className="balance-section">
                    <span>Tu Balance $GAME:</span>
                    <span className="balance">🎮 {actions.formatAmount(gameBalance)} $GAME</span>
                </div>

                <div className="bet-section">
                    <label>Selecciona tu apuesta:</label>
                    <div className="bet-grid">
                        {BET_AMOUNTS.map(amount => (
                            <button
                                key={amount}
                                className={`bet-btn ${selectedBet === amount && !customBet ? 'active' : ''} ${gameBalance < amount ? 'disabled' : ''}`}
                                onClick={() => {
                                    setSelectedBet(amount)
                                    setCustomBet('')
                                }}
                                disabled={gameBalance < amount}
                            >
                                {amount} $GAME
                            </button>
                        ))}
                    </div>

                    <div className="custom-bet">
                        <label>Apuesta personalizada:</label>
                        <input
                            type="number"
                            min="10"
                            max={gameBalance}
                            placeholder="Mínimo 10 $GAME"
                            value={customBet}
                            onChange={(e) => setCustomBet(e.target.value)}
                        />
                    </div>
                </div>

                {gameType === 'pvp' && (
                    <div className="info-box">
                        <div className="info-title">💡 ¿Cómo funciona?</div>
                        <ul>
                            <li>Ambos jugadores apuestan la misma cantidad</li>
                            <li>El ganador recibe el doble de la apuesta</li>
                            <li>En caso de empate, se devuelven las apuestas</li>
                        </ul>
                    </div>
                )}

                {gameType === 'dao' && (
                    <div className="info-box">
                        <div className="info-title">🏛️ Modo DAO</div>
                        <ul>
                            <li>La comunidad vota cada movimiento</li>
                            <li>Tu apuesta te da más peso en la votación</li>
                            <li>Si el equipo gana, recibes tu parte proporcional</li>
                        </ul>
                    </div>
                )}

                <div className="summary">
                    <div className="summary-row">
                        <span>Apuesta:</span>
                        <span>{currentBet} $GAME</span>
                    </div>
                    {gameType === 'pvp' && (
                        <div className="summary-row highlight">
                            <span>Ganancia potencial:</span>
                            <span>+{currentBet} $GAME</span>
                        </div>
                    )}
                </div>

                {error && <div className="error">{error}</div>}

                <button
                    className="start-btn"
                    onClick={handleStartGame}
                    disabled={!isValid || isLoading || !connected}
                >
                    {isLoading ? '⏳ Procesando...' :
                        !connected ? '🔗 Conecta tu Wallet' :
                            !canAfford ? '💸 Balance insuficiente' :
                                gameType === 'pvp' ? '⚔️ Buscar Oponente' : '🏛️ Unirse al Juego'
                    }
                </button>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 200;
                    padding: 20px;
                }

                .modal-content {
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 450px;
                    width: 100%;
                    position: relative;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .close-btn {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    opacity: 0.7;
                }

                .close-btn:hover { opacity: 1; }

                .modal-header {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .icon { font-size: 48px; }
                .modal-header h2 { margin: 8px 0 4px; }
                .modal-header p { color: rgba(255,255,255,0.6); margin: 0; }

                .balance-section {
                    display: flex;
                    justify-content: space-between;
                    background: rgba(0,0,0,0.2);
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .balance {
                    font-weight: 600;
                    color: #48bb78;
                }

                .bet-section { margin-bottom: 20px; }
                .bet-section label { 
                    display: block; 
                    margin-bottom: 12px;
                    color: rgba(255,255,255,0.8);
                }

                .bet-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .bet-btn {
                    padding: 12px;
                    background: rgba(255,255,255,0.1);
                    border: 2px solid transparent;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .bet-btn:hover:not(.disabled) {
                    background: rgba(255,255,255,0.15);
                }

                .bet-btn.active {
                    border-color: #48bb78;
                    background: rgba(72, 187, 120, 0.2);
                }

                .bet-btn.disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .custom-bet { margin-top: 12px; }
                .custom-bet label { font-size: 14px; }

                .custom-bet input {
                    width: 100%;
                    padding: 12px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    margin-top: 8px;
                }

                .custom-bet input:focus {
                    outline: none;
                    border-color: #48bb78;
                }

                .info-box {
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                }

                .info-title {
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .info-box ul {
                    margin: 0;
                    padding-left: 20px;
                    font-size: 14px;
                    color: rgba(255,255,255,0.7);
                }

                .info-box li { margin-bottom: 4px; }

                .summary {
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                }

                .summary-row.highlight {
                    color: #48bb78;
                    font-weight: 600;
                }

                .error {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    text-align: center;
                }

                .start-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #48bb78, #38a169);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .start-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
                }

                .start-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: #4a5568;
                }
            `}</style>
        </div>
    )
}
