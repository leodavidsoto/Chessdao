'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSocket } from '@/hooks/useSocket'
import CustomChess from '@/components/CustomChess'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/config'

/**
 * InviteGame - Component for creating and joining invite-based games
 */
export default function InviteGame({ inviteCode, onBack }) {
    const { publicKey, connected } = useWallet()
    const { socket, connected: socketConnected } = useSocket()

    const [gameState, setGameState] = useState('creating') // creating, waiting, playing, ended
    const [inviteLink, setInviteLink] = useState('')
    const [copied, setCopied] = useState(false)
    const [opponent, setOpponent] = useState(null)
    const [playerColor, setPlayerColor] = useState('white')
    const [currentGame, setCurrentGame] = useState(null)
    const [error, setError] = useState(null)

    // Generate a unique invite code
    const generateInviteCode = useCallback(() => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }, [])

    // Create a new invite game
    const createInviteGame = useCallback(async () => {
        if (!publicKey) {
            setError('Conecta tu wallet para crear una partida')
            return
        }

        try {
            const code = generateInviteCode()

            const response = await apiFetch('/api/games/invite', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'create',
                    creator: publicKey.toString(),
                    inviteCode: code
                })
            })

            const data = await response.json()

            if (data.success) {
                setCurrentGame(data.game)
                const link = `${window.location.origin}/play/${code}`
                setInviteLink(link)
                setPlayerColor('white')
                setGameState('waiting')

                // Listen for opponent joining via socket
                if (socket) {
                    socket.emit('join_invite_room', { inviteCode: code })
                }
            } else {
                setError(data.error || 'Error al crear la partida')
            }
        } catch (err) {
            console.error('Create invite game error:', err)
            setError('Error de conexión')
        }
    }, [publicKey, generateInviteCode, socket])

    // Join an existing invite game
    const joinInviteGame = useCallback(async (code) => {
        if (!publicKey) {
            setError('Conecta tu wallet para unirte')
            return
        }

        try {
            const response = await apiFetch('/api/games/invite', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'join',
                    inviteCode: code,
                    player: publicKey.toString()
                })
            })

            const data = await response.json()

            if (data.success) {
                setCurrentGame(data.game)
                setOpponent(data.game.creator)
                setPlayerColor('black')
                setGameState('playing')

                // Notify creator that opponent joined
                if (socket) {
                    socket.emit('opponent_joined', {
                        inviteCode: code,
                        opponent: publicKey.toString()
                    })
                }
            } else {
                setError(data.error || 'No se pudo unir a la partida')
            }
        } catch (err) {
            console.error('Join invite game error:', err)
            setError('Error de conexión')
        }
    }, [publicKey, socket])

    // Copy invite link to clipboard
    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(inviteLink)
            setCopied(true)
            toast.success('¡Link copiado!')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Copy failed:', err)
            toast.error('No se pudo copiar')
        }
    }, [inviteLink])

    // Initialize based on whether we have an invite code
    useEffect(() => {
        if (inviteCode) {
            // Joining an existing game
            joinInviteGame(inviteCode)
        } else {
            // Creating a new game
            createInviteGame()
        }
    }, [inviteCode])

    // Listen for opponent joining
    useEffect(() => {
        if (!socket) return

        socket.on('opponent_joined', (data) => {
            console.log('Opponent joined:', data)
            setOpponent(data.opponent)
            setGameState('playing')
            toast.success('¡Tu oponente se unió!')
        })

        return () => {
            socket.off('opponent_joined')
        }
    }, [socket])

    // Render error state
    if (error) {
        return (
            <div className="invite-container">
                <div className="invite-card error">
                    <div className="error-icon">❌</div>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={onBack} className="back-btn">
                        Volver al Menú
                    </button>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    // Render waiting for opponent
    if (gameState === 'waiting') {
        return (
            <div className="invite-container">
                <div className="invite-card">
                    <div className="waiting-icon">⏳</div>
                    <h2>Esperando Oponente</h2>
                    <p>Comparte este link con tu amigo:</p>

                    <div className="link-box">
                        <input
                            type="text"
                            value={inviteLink}
                            readOnly
                            className="link-input"
                        />
                        <button
                            onClick={copyLink}
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                        >
                            {copied ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                    </div>

                    <div className="invite-code">
                        <span className="label">Código:</span>
                        <span className="code">{currentGame?.inviteCode}</span>
                    </div>

                    <div className="waiting-animation">
                        <div className="pulse-ring"></div>
                        <span className="waiting-text">Esperando...</span>
                    </div>

                    <button onClick={onBack} className="cancel-btn">
                        Cancelar
                    </button>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    // Render game
    if (gameState === 'playing') {
        return (
            <div className="game-container">
                <div className="opponent-info">
                    <span className="vs">VS</span>
                    <span className="opponent-name">
                        {opponent ? `${opponent.slice(0, 8)}...` : 'Oponente'}
                    </span>
                </div>
                <CustomChess
                    onBack={onBack}
                    vsAI={false}
                    betAmount={0}
                    playerColor={playerColor}
                    gameId={currentGame?.id}
                    onGameEnd={(result) => {
                        setGameState('ended')
                        toast.success(result.winner === playerColor
                            ? '🏆 ¡Ganaste!'
                            : '💀 Perdiste'
                        )
                    }}
                />
                <style jsx>{styles}</style>
            </div>
        )
    }

    // Render creating state
    return (
        <div className="invite-container">
            <div className="invite-card">
                <div className="loading-icon">🎮</div>
                <h2>Creando Partida...</h2>
                <div className="spinner"></div>
            </div>
            <style jsx>{styles}</style>
        </div>
    )
}

const styles = `
    .invite-container {
        min-height: 100vh;
        background: radial-gradient(ellipse at center, #0B1221 0%, #020617 70%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .invite-card {
        background: rgba(11, 18, 33, 0.95);
        border: 1px solid rgba(45, 226, 230, 0.3);
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 100%;
        text-align: center;
        box-shadow: 0 0 50px rgba(45, 226, 230, 0.15);
    }

    .invite-card.error {
        border-color: rgba(239, 68, 68, 0.5);
    }

    .waiting-icon, .error-icon, .loading-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .invite-card h2 {
        color: #F8FAFC;
        font-family: 'Orbitron', sans-serif;
        font-size: 24px;
        margin: 0 0 16px;
    }

    .invite-card p {
        color: #94A3B8;
        margin: 0 0 24px;
    }

    .link-box {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
    }

    .link-input {
        flex: 1;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(45, 226, 230, 0.2);
        border-radius: 10px;
        color: #F8FAFC;
        font-size: 14px;
        font-family: 'Roboto Mono', monospace;
    }

    .copy-btn {
        padding: 12px 20px;
        background: linear-gradient(135deg, #2DE2E6, #7D2AE8);
        color: #020617;
        border: none;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
    }

    .copy-btn:hover {
        transform: scale(1.05);
    }

    .copy-btn.copied {
        background: linear-gradient(135deg, #10B981, #059669);
    }

    .invite-code {
        background: rgba(212, 175, 55, 0.1);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 24px;
    }

    .invite-code .label {
        color: #94A3B8;
        font-size: 14px;
        margin-right: 8px;
    }

    .invite-code .code {
        color: #D4AF37;
        font-size: 28px;
        font-weight: 700;
        font-family: 'Orbitron', sans-serif;
        letter-spacing: 0.1em;
    }

    .waiting-animation {
        margin: 24px 0;
        position: relative;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .pulse-ring {
        position: absolute;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 3px solid #2DE2E6;
        animation: pulse-ring 1.5s infinite;
    }

    @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
    }

    .waiting-text {
        color: #2DE2E6;
        font-family: 'Orbitron', sans-serif;
        font-size: 14px;
        z-index: 1;
    }

    .cancel-btn, .back-btn {
        padding: 14px 32px;
        background: rgba(239, 68, 68, 0.2);
        color: #EF4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
    }

    .cancel-btn:hover, .back-btn:hover {
        background: rgba(239, 68, 68, 0.3);
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(45, 226, 230, 0.2);
        border-top-color: #2DE2E6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .game-container {
        min-height: 100vh;
        background: radial-gradient(ellipse at center, #0B1221 0%, #020617 70%);
    }

    .opponent-info {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px;
        background: rgba(11, 18, 33, 0.9);
        border-bottom: 1px solid rgba(45, 226, 230, 0.2);
    }

    .vs {
        color: #D4AF37;
        font-weight: 700;
        font-family: 'Orbitron', sans-serif;
    }

    .opponent-name {
        color: #F8FAFC;
        font-family: 'Roboto Mono', monospace;
    }
`
