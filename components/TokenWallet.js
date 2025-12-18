'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useGameTokens } from '@/hooks/useGameTokens'
import { useChessTokens } from '@/hooks/useChessTokens'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Wallet,
    Coins,
    ArrowDownUp,
    RefreshCw,
    TrendingUp,
    ChevronDown,
    ExternalLink
} from 'lucide-react'
import TokenSwap from './TokenSwap'

/**
 * TokenWallet - Widget de wallet que muestra ambos balances
 * Con acceso rápido a swap
 */
export default function TokenWallet({ compact = false }) {
    const { publicKey, connected } = useWallet()
    const { gameBalance, stats, loading: gameLoading, actions: gameActions } = useGameTokens()
    const { chessBalance, solBalance, loading: chessLoading, actions: chessActions } = useChessTokens()
    const [showSwap, setShowSwap] = useState(false)
    const [expanded, setExpanded] = useState(!compact)

    const isLoading = gameLoading || chessLoading

    const handleRefresh = () => {
        gameActions.refreshBalance()
        chessActions.refreshBalances()
    }

    if (!connected) {
        return (
            <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 text-center">
                    <Wallet className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                    <p className="text-slate-400 text-sm">Conecta tu wallet</p>
                </CardContent>
            </Card>
        )
    }

    // Compact version for navbar
    if (compact && !expanded) {
        return (
            <>
                <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 rounded-lg p-2 transition-colors"
                    onClick={() => setExpanded(true)}
                >
                    {/* GAME Balance */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg">🎮</span>
                        <span className="text-white font-semibold">
                            {gameActions.formatAmount(gameBalance)}
                        </span>
                    </div>

                    <div className="w-px h-4 bg-slate-600" />

                    {/* CHESS Balance */}
                    <div className="flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-purple-400" />
                        <span className="text-white font-semibold">
                            {chessActions.formatChessAmount(chessBalance)}
                        </span>
                    </div>

                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>

                {showSwap && (
                    <TokenSwap
                        onClose={() => setShowSwap(false)}
                        onSwapComplete={() => {
                            handleRefresh()
                            setShowSwap(false)
                        }}
                    />
                )}
            </>
        )
    }

    return (
        <>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-700/50 px-4 py-3 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-purple-400" />
                        <span className="font-semibold text-white">Tu Wallet</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="h-8 w-8 text-slate-400 hover:text-white"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        {compact && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpanded(false)}
                                className="h-8 w-8 text-slate-400 hover:text-white"
                            >
                                ✕
                            </Button>
                        )}
                    </div>
                </div>

                <CardContent className="p-4 space-y-4">
                    {/* $GAME Token */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🎮</span>
                                <div>
                                    <span className="font-bold text-white">$GAME</span>
                                    <Badge variant="outline" className="ml-2 text-xs border-yellow-500/50 text-yellow-400">
                                        Interno
                                    </Badge>
                                </div>
                            </div>
                            <TrendingUp className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {gameActions.formatAmount(gameBalance)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Para juegos y apuestas
                        </p>

                        {/* Stats */}
                        {stats && (stats.totalEarned > 0 || stats.totalSpent > 0) && (
                            <div className="flex gap-4 mt-3 pt-3 border-t border-yellow-500/20 text-xs">
                                <div>
                                    <span className="text-slate-400">Ganado:</span>
                                    <span className="text-green-400 ml-1">+{gameActions.formatAmount(stats.totalEarned)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Gastado:</span>
                                    <span className="text-red-400 ml-1">-{gameActions.formatAmount(stats.totalSpent)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CHESS Token */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Coins className="h-6 w-6 text-purple-400" />
                                <div>
                                    <span className="font-bold text-white">CHESS</span>
                                    <Badge variant="outline" className="ml-2 text-xs border-blue-500/50 text-blue-400">
                                        TON Token
                                    </Badge>
                                </div>
                            </div>
                            <a
                                href={`https://tonviewer.com/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-400 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {chessActions.formatChessAmount(chessBalance)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Token en TON • ${chessActions.getUsdValue(chessBalance)} USD
                        </p>
                    </div>

                    {/* TON Balance */}
                    <div className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center">
                                <span className="text-xs font-bold">💎</span>
                            </div>
                            <span className="text-white font-medium">TON</span>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-semibold">
                                {chessActions.formatSolAmount(solBalance)}
                            </div>
                            <div className="text-xs text-slate-400">
                                Para transacciones
                            </div>
                        </div>
                    </div>

                    {/* Swap Button */}
                    <Button
                        onClick={() => setShowSwap(true)}
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold"
                    >
                        <ArrowDownUp className="h-5 w-5 mr-2" />
                        Swap Tokens
                    </Button>

                    {/* Conversion info */}
                    <div className="text-center text-xs text-slate-500">
                        1 CHESS = 100 $GAME • Comisión 1%
                    </div>
                </CardContent>
            </Card>

            {/* Swap Modal */}
            {showSwap && (
                <TokenSwap
                    onClose={() => setShowSwap(false)}
                    onSwapComplete={() => {
                        handleRefresh()
                    }}
                />
            )}
        </>
    )
}
