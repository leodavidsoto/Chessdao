'use client'

import { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useGameTokens } from '@/hooks/useGameTokens'
import { useChessTokens } from '@/hooks/useChessTokens'
import { useTokenSwap } from '@/hooks/useTokenSwap'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    ArrowDownUp,
    Coins,
    Zap,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    History,
    Info,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export default function TokenSwap({ onClose, onSwapComplete }) {
    const { publicKey, connected } = useWallet()
    const { gameBalance, actions: gameActions } = useGameTokens()
    const { chessBalance, actions: chessActions } = useChessTokens()
    const {
        loading: swapLoading,
        rates,
        history,
        config,
        actions: swapActions
    } = useTokenSwap()

    const [fromToken, setFromToken] = useState('CHESS')
    const [toToken, setToToken] = useState('GAME')
    const [amount, setAmount] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [showHistory, setShowHistory] = useState(false)

    // Calculate preview
    const preview = useMemo(() => {
        const numAmount = parseFloat(amount) || 0
        return swapActions.calculatePreview(fromToken, numAmount)
    }, [amount, fromToken, swapActions])

    // Get current balance based on fromToken
    const currentBalance = fromToken === 'GAME' ? gameBalance : chessBalance

    // Validation
    const validation = useMemo(() => {
        const numAmount = parseFloat(amount) || 0
        return swapActions.validate(fromToken, numAmount, currentBalance)
    }, [amount, fromToken, currentBalance, swapActions])

    // Switch tokens
    const handleSwitchTokens = () => {
        setFromToken(toToken)
        setToToken(fromToken)
        setAmount('')
    }

    // Set max amount
    const handleSetMax = () => {
        setAmount(currentBalance.toString())
    }

    // Quick amounts
    const handleQuickAmount = (percent) => {
        const quickAmount = Math.floor(currentBalance * (percent / 100))
        setAmount(quickAmount.toString())
    }

    // Execute swap
    const handleSwap = async () => {
        if (!validation.valid || !amount) return

        setIsProcessing(true)

        try {
            const numAmount = parseFloat(amount)
            const result = await swapActions.swap(fromToken, toToken, numAmount)

            if (result.success) {
                toast.success('¡Swap completado!', {
                    description: `${result.fromAmount} ${fromToken} → ${result.toAmount} ${toToken}`
                })

                // Refresh balances
                gameActions.refreshBalance()
                chessActions.refreshBalances()

                setAmount('')

                if (onSwapComplete) {
                    onSwapComplete(result)
                }
            } else {
                toast.error('Swap fallido', {
                    description: result.error
                })
            }
        } catch (error) {
            toast.error('Error en el swap', {
                description: error.message
            })
        } finally {
            setIsProcessing(false)
        }
    }

    // Refresh rates
    useEffect(() => {
        swapActions.fetchRates()
    }, [])

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 max-w-md w-full shadow-2xl">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl text-white flex items-center">
                                <ArrowDownUp className="h-7 w-7 mr-3 text-purple-400" />
                                Token Swap
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                                Intercambia entre $GAME y CHESS
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHistory(!showHistory)}
                                className="text-slate-400 hover:text-white"
                            >
                                <History className="h-5 w-5" />
                            </Button>
                            {onClose && (
                                <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
                                    ✕
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* History Panel */}
                    {showHistory && (
                        <div className="bg-slate-700/50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Historial de Swaps</h4>
                            {history.length === 0 ? (
                                <p className="text-xs text-slate-400">Sin swaps recientes</p>
                            ) : (
                                <div className="space-y-2">
                                    {history.slice(0, 5).map((swap, i) => (
                                        <div key={i} className="flex justify-between text-xs text-slate-300">
                                            <span>{swap.fromAmount} {swap.fromToken} → {swap.toAmount} {swap.toToken}</span>
                                            <span className="text-slate-500">{new Date(swap.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* From Token */}
                    <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">De</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">
                                    Balance: {fromToken === 'GAME'
                                        ? gameActions.formatAmount(gameBalance)
                                        : chessActions.formatChessAmount(chessBalance)
                                    }
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSetMax}
                                    className="text-xs text-purple-400 hover:text-purple-300 h-6 px-2"
                                >
                                    MAX
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="bg-transparent border-none text-2xl text-white font-semibold p-0 h-auto focus:ring-0"
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${fromToken === 'GAME'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-purple-500/20 text-purple-400'
                                }`}>
                                {fromToken === 'GAME' ? (
                                    <span className="text-xl">🎮</span>
                                ) : (
                                    <Coins className="h-5 w-5" />
                                )}
                                <span className="font-semibold">{fromToken === 'GAME' ? '$GAME' : 'CHESS'}</span>
                            </div>
                        </div>

                        {/* Quick amounts */}
                        <div className="flex gap-2 mt-3">
                            {[25, 50, 75, 100].map(percent => (
                                <Button
                                    key={percent}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleQuickAmount(percent)}
                                    className="text-xs text-slate-400 hover:text-white h-7 px-2 flex-1"
                                    disabled={isProcessing}
                                >
                                    {percent}%
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Switch Button */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSwitchTokens}
                            className="rounded-full bg-slate-700 border-slate-500 hover:bg-slate-600 h-10 w-10"
                            disabled={isProcessing}
                        >
                            <ArrowDownUp className="h-4 w-4 text-purple-400" />
                        </Button>
                    </div>

                    {/* To Token */}
                    <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">A (estimado)</span>
                            <span className="text-xs text-slate-400">
                                Balance: {toToken === 'GAME'
                                    ? gameActions.formatAmount(gameBalance)
                                    : chessActions.formatChessAmount(chessBalance)
                                }
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <div className="text-2xl text-white font-semibold">
                                    {preview.netAmount > 0 ? preview.netAmount.toLocaleString() : '0'}
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${toToken === 'GAME'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-purple-500/20 text-purple-400'
                                }`}>
                                {toToken === 'GAME' ? (
                                    <span className="text-xl">🎮</span>
                                ) : (
                                    <Coins className="h-5 w-5" />
                                )}
                                <span className="font-semibold">{toToken === 'GAME' ? '$GAME' : 'CHESS'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Swap Details */}
                    {amount && parseFloat(amount) > 0 && (
                        <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex justify-between text-slate-400">
                                <span>Tasa</span>
                                <span className="text-white">
                                    1 {fromToken} = {fromToken === 'GAME'
                                        ? config.GAME_TO_CHESS_RATE
                                        : config.CHESS_TO_GAME_RATE
                                    } {toToken}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Comisión ({config.SWAP_FEE_PERCENT}%)</span>
                                <span className="text-orange-400">
                                    -{preview.fee} {toToken}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-300 font-semibold pt-2 border-t border-slate-600">
                                <span>Recibirás</span>
                                <span className="text-green-400">
                                    {preview.netAmount.toLocaleString()} {toToken}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Validation Errors */}
                    {!validation.valid && amount && (
                        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-red-300">
                                {validation.errors.join('. ')}
                            </div>
                        </div>
                    )}

                    {/* Swap Button */}
                    <Button
                        onClick={handleSwap}
                        disabled={!validation.valid || !amount || isProcessing || !connected}
                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : !connected ? (
                            '🔗 Conecta tu Wallet'
                        ) : !validation.valid ? (
                            validation.errors[0] || 'Ingresa una cantidad válida'
                        ) : (
                            <>
                                <Zap className="h-5 w-5 mr-2" />
                                Swap {amount || '0'} {fromToken}
                            </>
                        )}
                    </Button>

                    {/* Info */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Info className="h-3 w-3" />
                        <span>Los swaps son instantáneos • 1 CHESS = 10 $GAME</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
