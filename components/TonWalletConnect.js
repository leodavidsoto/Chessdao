'use client'

import { useState, useEffect } from 'react'
import { useTonConnect } from '@/hooks/useTonConnect'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Wallet, CheckCircle, ExternalLink, RefreshCw, LogOut, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

/**
 * TonWalletConnect - TON wallet connection component for Telegram Mini App
 * Uses TON Connect to connect to Tonkeeper, MyTonWallet, etc.
 */
export default function TonWalletConnect({ onConnect }) {
    const {
        isConnected,
        isConnecting,
        isInitialized,
        connectionTimedOut,
        address,
        balance,
        error,
        telegramUser,
        actions
    } = useTonConnect()

    const { actions: telegramActions } = useTelegramWebApp()
    const [showDetails, setShowDetails] = useState(false)

    // Notify parent when connected - this MUST be before any conditional returns
    useEffect(() => {
        if (isConnected && address) {
            onConnect?.({
                type: 'ton',
                address,
                balance,
                telegramUser
            })
        }
    }, [isConnected, address, balance, telegramUser, onConnect])

    const handleConnect = async () => {
        if (telegramActions?.hapticFeedback) {
            telegramActions.hapticFeedback('light')
        }
        await actions.connect()
    }

    const handleDisconnect = async () => {
        if (telegramActions?.hapticFeedback) {
            telegramActions.hapticFeedback('light')
        }
        await actions.disconnect()
        toast.info('Wallet desconectada')
    }

    const handleRefreshBalance = async () => {
        if (telegramActions?.hapticFeedback) {
            telegramActions.hapticFeedback('light')
        }
        await actions.refreshBalance()
        toast.success('Balance actualizado')
    }

    // Show loading while SDK initializes
    if (!isInitialized) {
        return (
            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-300">Inicializando TON Connect...</p>
                    <p className="text-xs text-slate-500 mt-2">Esto puede tomar unos segundos</p>
                </CardContent>
            </Card>
        )
    }

    // Connected state
    if (isConnected && address) {
        return (
            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                    {/* Connected header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">Conectado a TON</h3>
                            <p className="text-sm text-cyan-300">{actions.getFormattedAddress()}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-slate-400 hover:text-white"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Balance display */}
                    <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Balance TON</p>
                                <p className="text-2xl font-bold text-white">
                                    {balance !== null ? `${balance.toFixed(4)} TON` : '...'}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRefreshBalance}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Telegram user info */}
                    {telegramUser && (
                        <div className="bg-blue-900/30 rounded-lg p-3 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                {telegramUser.firstName?.[0] || 'U'}
                            </div>
                            <div>
                                <p className="text-sm text-white font-medium">{telegramUser.firstName}</p>
                                <p className="text-xs text-blue-300">@{telegramUser.username || 'telegram'}</p>
                            </div>
                        </div>
                    )}

                    {/* Details */}
                    {showDetails && (
                        <div className="bg-slate-900/30 rounded-lg p-3 mb-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Dirección completa:</span>
                            </div>
                            <p className="text-xs text-white font-mono break-all">{address}</p>
                        </div>
                    )}

                    {/* Disconnect button */}
                    <Button
                        variant="outline"
                        onClick={handleDisconnect}
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Desconectar
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Not connected state
    return (
        <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Conecta tu Wallet TON</CardTitle>
                        <CardDescription className="text-cyan-300">
                            Usa TON para jugar en ChessDAO
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Info about TON */}
                <div className="bg-blue-900/30 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        💎 ¿Por qué TON?
                    </h4>
                    <ul className="text-xs text-slate-300 space-y-1">
                        <li>✓ Integrado nativamente con Telegram</li>
                        <li>✓ Transacciones rápidas y baratas</li>
                        <li>✓ Tonkeeper, MyTonWallet y más</li>
                    </ul>
                </div>

                {/* Connect button */}
                <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/25"
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        <>
                            <Wallet className="w-5 h-5 mr-3" />
                            Conectar Wallet TON
                        </>
                    )}
                </Button>

                {/* Error display with retry option */}
                {error && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-300">{error}</p>
                                {connectionTimedOut && (
                                    <Button
                                        onClick={() => actions.retry()}
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 border-red-500/30 text-red-300 hover:bg-red-500/10"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reintentar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Wallet options */}
                <div className="flex justify-center gap-4 pt-2">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-1">
                            <span className="text-2xl">💎</span>
                        </div>
                        <span className="text-xs text-slate-400">Tonkeeper</span>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-1">
                            <span className="text-2xl">👛</span>
                        </div>
                        <span className="text-xs text-slate-400">MyTonWallet</span>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-1">
                            <span className="text-2xl">🔐</span>
                        </div>
                        <span className="text-xs text-slate-400">OpenMask</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
