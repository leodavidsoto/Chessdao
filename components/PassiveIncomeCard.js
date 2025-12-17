'use client'

import { useState } from 'react'
import { usePassiveIncome } from '@/hooks/usePassiveIncome'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Coins,
    Clock,
    TrendingUp,
    Zap,
    ChevronUp,
    Loader2,
    Gift
} from 'lucide-react'

const LEVEL_ICONS = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '💠',
    master: '👑'
}

const LEVEL_COLORS = {
    bronze: 'from-orange-600 to-amber-700',
    silver: 'from-slate-400 to-slate-500',
    gold: 'from-yellow-400 to-amber-500',
    platinum: 'from-cyan-400 to-blue-500',
    diamond: 'from-purple-400 to-pink-500',
    master: 'from-yellow-300 to-orange-400'
}

/**
 * PassiveIncomeCard - Shows PPH status, claim button, and upgrade option
 */
export default function PassiveIncomeCard({ walletAddress, onClose, compact = false }) {
    const { pphData, upgradeData, loading, claiming, upgrading, error, actions } = usePassiveIncome(walletAddress)
    const { isInTelegram, actions: tgActions } = useTelegramWebApp()
    const [showUpgrade, setShowUpgrade] = useState(false)

    if (loading && !pphData) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </CardContent>
            </Card>
        )
    }

    const level = pphData?.level || 'bronze'
    const accumulated = pphData?.accumulated || 0
    const pph = pphData?.pph || 10
    const canClaim = accumulated > 0

    // Compact version for dashboard
    if (compact) {
        return (
            <div
                className={`bg-gradient-to-r ${LEVEL_COLORS[level]} rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]`}
                onClick={() => canClaim && actions.claim()}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{LEVEL_ICONS[level]}</span>
                        <div>
                            <div className="text-white font-bold">{pph} $GAME/hr</div>
                            <div className="text-white/70 text-sm">
                                {canClaim ? `${accumulated} ready!` : 'Earning...'}
                            </div>
                        </div>
                    </div>
                    {canClaim && (
                        <Button
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white"
                            disabled={claiming}
                        >
                            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                            Claim
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    // Full card version
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className={`w-full max-w-md bg-gradient-to-br ${LEVEL_COLORS[level]}/20 border-2 border-white/20`}>
                <CardHeader className="text-center pb-2">
                    <div className="text-5xl mb-2">{LEVEL_ICONS[level]}</div>
                    <CardTitle className="text-2xl text-white capitalize">{level} Level</CardTitle>
                    <p className="text-white/70">Passive Income System</p>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Current PPH */}
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Coins className="w-5 h-5 text-yellow-400" />
                            <span className="text-3xl font-black text-white">{pph}</span>
                            <span className="text-white/70">$GAME/hr</span>
                        </div>
                        <p className="text-sm text-white/60">
                            Max: {pphData?.maxAccumulation} (3 hours)
                        </p>
                    </div>

                    {/* Accumulated */}
                    <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white/70 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Accumulated
                            </span>
                            <span className="text-2xl font-bold text-yellow-400">
                                {accumulated} $GAME
                            </span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min((accumulated / (pphData?.maxAccumulation || 30)) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                            {pphData?.hoursSinceLastClaim?.toFixed(1) || 0}h since last claim
                        </p>
                    </div>

                    {/* Claim Button */}
                    <Button
                        onClick={() => {
                            actions.claim()
                            if (isInTelegram) tgActions.hapticFeedback('success')
                        }}
                        disabled={!canClaim || claiming}
                        className={`w-full h-14 text-lg font-bold ${canClaim
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                                : 'bg-slate-600'
                            }`}
                    >
                        {claiming ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Gift className="w-5 h-5 mr-2" />
                        )}
                        {canClaim ? `Claim ${accumulated} $GAME` : 'Nothing to claim yet'}
                    </Button>

                    {/* Upgrade Section */}
                    {pphData?.nextLevel && (
                        <div className="bg-black/30 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                    <span className="text-white font-semibold">Upgrade</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl">{LEVEL_ICONS[pphData.nextLevel]}</span>
                                    <span className="text-white capitalize ml-1">{pphData.nextLevel}</span>
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    actions.upgrade()
                                    if (isInTelegram) tgActions.hapticFeedback('medium')
                                }}
                                disabled={!upgradeData?.canAfford || upgrading}
                                variant="outline"
                                className="w-full border-green-500/50 text-green-400 hover:bg-green-500/20"
                            >
                                {upgrading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <ChevronUp className="w-4 h-4 mr-2" />
                                )}
                                Upgrade for {pphData.upgradeCost?.toLocaleString()} $GAME
                            </Button>

                            {!upgradeData?.canAfford && (
                                <p className="text-xs text-red-400 mt-2 text-center">
                                    Need {(pphData.upgradeCost - (upgradeData?.gameBalance || 0)).toLocaleString()} more $GAME
                                </p>
                            )}
                        </div>
                    )}

                    {/* Close */}
                    {onClose && (
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="w-full text-white/70 hover:text-white"
                        >
                            Close
                        </Button>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
