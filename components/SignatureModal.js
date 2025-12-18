'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Shield, X, Loader2, AlertCircle, CheckCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { useTonConnect } from '@/hooks/useTonConnect'

/**
 * Modal de confirmación de firma para Phantom wallet (browser) o TON (Telegram)
 */
export default function SignatureModal({
    isOpen,
    onClose,
    onSign,
    actionType,
    actionDetails,
    isSigning,
    error
}) {
    const { connected, signMessage } = useWallet()
    const { isInTelegram } = useTelegramWebApp()
    const { isConnected: tonConnected, actions: tonActions } = useTonConnect()
    const [showSuccess, setShowSuccess] = useState(false)

    // Títulos por tipo de acción
    const ACTION_TITLES = {
        START_GAME_BET: '🎮 Iniciar Partida con Apuesta',
        BUY_TOKENS: '💰 Comprar Tokens CHESS',
        OPEN_LOOTBOX: '🎁 Abrir Loot Box',
        SEND_CHALLENGE: '⚔️ Enviar Desafío',
        TRANSFER_TOKENS: '📤 Transferir Tokens',
        GENERIC: '🔐 Confirmar Acción'
    }

    // Descripciones por tipo de acción
    const ACTION_DESCRIPTIONS = {
        START_GAME_BET: `Vas a iniciar una partida con una apuesta de ${actionDetails?.amount || 0} CHESS tokens. Si pierdes, perderás estos tokens.`,
        BUY_TOKENS: `Vas a comprar ${actionDetails?.amount || 0} CHESS tokens por ${actionDetails?.price || '?'} ${isInTelegram ? 'TON' : 'USD'}.`,
        OPEN_LOOTBOX: `Vas a abrir un Loot Box ${actionDetails?.type || 'Normal'} por ${actionDetails?.cost || 0} CHESS tokens.`,
        SEND_CHALLENGE: `Vas a desafiar a ${actionDetails?.opponent || 'un jugador'} con una apuesta de ${actionDetails?.amount || 0} CHESS tokens.`,
        TRANSFER_TOKENS: `Vas a transferir ${actionDetails?.amount || 0} CHESS tokens.`,
        GENERIC: 'Esta acción requiere tu confirmación.'
    }

    const handleSign = async () => {
        console.log('🔐 handleSign called, connected:', connected, 'signMessage:', !!signMessage, 'isInTelegram:', isInTelegram)
        const result = await onSign()
        console.log('🔐 Sign result:', result)
        if (result?.valid) {
            setShowSuccess(true)
            setTimeout(() => {
                setShowSuccess(false)
                onClose(true) // true = firma exitosa
            }, 1000)
        }
    }

    if (!isOpen) return null

    // Determine if wallet is connected based on context
    const isWalletConnected = isInTelegram ? tonConnected : connected
    const walletNotConnected = isInTelegram ? !tonConnected : (!connected || !signMessage)
    const walletName = isInTelegram ? 'TON Wallet' : 'Phantom'

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Shield className="h-6 w-6 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {ACTION_TITLES[actionType] || ACTION_TITLES.GENERIC}
                        </h2>
                    </div>
                    <button
                        onClick={() => onClose(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                        disabled={isSigning}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Descripción */}
                    <p className="text-gray-300">
                        {ACTION_DESCRIPTIONS[actionType] || ACTION_DESCRIPTIONS.GENERIC}
                    </p>

                    {/* Detalles */}
                    {actionDetails && (
                        <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                            {actionDetails.amount !== undefined && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Cantidad:</span>
                                    <span className="text-yellow-400 font-semibold">
                                        {actionDetails.amount} CHESS
                                    </span>
                                </div>
                            )}
                            {actionDetails.type && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Tipo:</span>
                                    <span className="text-white">{actionDetails.type}</span>
                                </div>
                            )}
                            {actionDetails.opponent && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Oponente:</span>
                                    <span className="text-white">{actionDetails.opponent}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mensaje de seguridad */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <Wallet className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-purple-300">
                                {isInTelegram ? (
                                    <>Se confirmará esta acción usando tu wallet TON.
                                        <strong> No se realizará ninguna transacción hasta que confirmes.</strong></>
                                ) : (
                                    <>Se abrirá Phantom para que firmes y confirmes esta acción.
                                        <strong> No se realizará ninguna transacción hasta que firmes.</strong></>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {showSuccess && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                                <p className="text-sm text-green-300">¡Confirmación exitosa!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        disabled={isSigning}
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                        Cancelar
                    </Button>

                    {walletNotConnected ? (
                        <div className="flex-1">
                            {isInTelegram ? (
                                <Button
                                    onClick={() => tonActions.connect()}
                                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                                >
                                    💎 Conectar TON
                                </Button>
                            ) : (
                                <WalletMultiButton className="w-full !bg-gradient-to-r !from-purple-500 !to-indigo-500 !rounded-lg !h-10" />
                            )}
                            <p className="text-xs text-center text-gray-400 mt-2">
                                Conecta tu wallet para confirmar
                            </p>
                        </div>
                    ) : (
                        <Button
                            onClick={handleSign}
                            disabled={isSigning || showSuccess}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                        >
                            {isSigning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Esperando...
                                </>
                            ) : showSuccess ? (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    ¡Confirmado!
                                </>
                            ) : (
                                <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Confirmar
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

