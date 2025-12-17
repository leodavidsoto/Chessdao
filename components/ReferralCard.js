'use client'

import { useState } from 'react'
import { useReferral } from '@/hooks/useReferral'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Gift,
    Users,
    Copy,
    Share2,
    Star,
    Coins,
    CheckCircle,
    Loader2
} from 'lucide-react'

/**
 * ReferralCard - UI component for sharing referral links and viewing stats
 */
export default function ReferralCard({ walletAddress, onClose }) {
    const { referralData, loading, error, actions } = useReferral(walletAddress)
    const { isInTelegram, telegramUser } = useTelegramWebApp()
    const [copied, setCopied] = useState(false)
    const [sharing, setSharing] = useState(false)

    const handleCopy = async () => {
        const success = await actions.copyCode()
        if (success) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleShare = async () => {
        setSharing(true)
        const result = await actions.shareReferralLink()
        if (result === 'copied') {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
        setSharing(false)
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <Card className="w-full max-w-md mx-4 bg-slate-800 border-purple-500/30">
                    <CardContent className="p-8 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        <p className="mt-4 text-slate-400">Loading referral data...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gradient-to-br from-purple-900/90 to-indigo-900/90 border-purple-500/40">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mb-3">
                        <Gift className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl text-white">Invite Friends</CardTitle>
                    <p className="text-purple-200 text-sm mt-1">
                        Earn up to 10,000 $GAME per referral!
                    </p>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Reward Tiers */}
                    <div className="bg-black/30 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-purple-200 mb-2">Rewards</h4>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-white">Regular user</span>
                            </div>
                            <span className="text-yellow-400 font-bold">
                                +{referralData?.rewards?.normalUser?.toLocaleString()} $GAME
                            </span>
                        </div>

                        <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-2 -mx-2">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                <span className="text-white font-semibold">
                                    Premium user
                                </span>
                            </div>
                            <span className="text-yellow-300 font-black text-lg">
                                +{referralData?.rewards?.premiumUser?.toLocaleString()} $GAME
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-2 border-t border-purple-500/20">
                            <span className="text-purple-300">Your friend gets</span>
                            <span className="text-green-400 font-semibold">
                                +{referralData?.rewards?.inviteeBonus?.toLocaleString()} $GAME
                            </span>
                        </div>
                    </div>

                    {/* Referral Code */}
                    <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-purple-200">Your Code</span>
                            <button
                                onClick={handleCopy}
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3 text-center">
                            <span className="text-2xl font-mono font-bold text-white tracking-widest">
                                {referralData?.referralCode || '------'}
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-black/30 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-white">
                                {referralData?.stats?.totalReferred || 0}
                            </div>
                            <div className="text-xs text-purple-300">Invited</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-yellow-400">
                                {referralData?.stats?.premiumReferred || 0}
                            </div>
                            <div className="text-xs text-purple-300">Premium</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-green-400">
                                {(referralData?.stats?.totalEarnings || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-purple-300">Earned</div>
                        </div>
                    </div>

                    {/* Share Button */}
                    <Button
                        onClick={handleShare}
                        disabled={sharing}
                        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                    >
                        {sharing ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Share2 className="w-5 h-5 mr-2" />
                        )}
                        {isInTelegram ? 'Share in Telegram' : 'Share Invite Link'}
                    </Button>

                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-purple-300 hover:text-white hover:bg-purple-500/20"
                    >
                        Close
                    </Button>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
