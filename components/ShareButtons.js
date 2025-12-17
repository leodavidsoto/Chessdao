'use client'

import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { useReferral } from '@/hooks/useReferral'
import { Button } from '@/components/ui/button'
import {
    Share2,
    Trophy,
    TrendingUp,
    Flame,
    Sparkles,
    Camera
} from 'lucide-react'

/**
 * Pre-written share messages with referral link
 */
const SHARE_TEMPLATES = {
    victory: (stats, referralLink) => ({
        text: `🏆 ¡Acabo de ganar mi partida #${stats.gamesWon || 1} en ChessDAO!\n\nMi rating: ${stats.rating || 1200} ELO\n¿Puedes vencerme? ♟️\n\n👇 Únete y gana 1,000 $GAME gratis:`,
        url: referralLink,
        icon: '🏆'
    }),
    levelUp: (level, referralLink) => ({
        text: `⬆️ ¡Subí a nivel ${level.toUpperCase()} en ChessDAO!\n\n💰 Ahora gano tokens cada hora\n🎮 Juega y gana conmigo:\n`,
        url: referralLink,
        icon: '⬆️'
    }),
    streak: (count, referralLink) => ({
        text: `🔥 ¡${count} victorias seguidas en ChessDAO!\n\nEstoy imparable ♟️💪\n\n¿Crees que puedes detenerme?`,
        url: referralLink,
        icon: '🔥'
    }),
    achievement: (achievement, referralLink) => ({
        text: `🎖️ ¡Desbloqueé "${achievement}" en ChessDAO!\n\n♟️ El mejor juego de ajedrez con cripto\n\n👇 Únete gratis:`,
        url: referralLink,
        icon: '🎖️'
    }),
    invite: (referralLink) => ({
        text: `🎁 ¡Únete a ChessDAO y recibe 1,000 $GAME gratis!\n\n♟️ Juega ajedrez\n💰 Gana tokens reales\n🏆 Compite en torneos\n`,
        url: referralLink,
        icon: '🎁'
    })
}

/**
 * ShareButtons - 1-click share buttons with pre-written messages
 */
export default function ShareButtons({
    walletAddress,
    type = 'invite',
    stats = {},
    level = 'bronze',
    streakCount = 0,
    achievement = '',
    compact = false
}) {
    const { isInTelegram, webApp, referralCode } = useTelegramWebApp()
    const { referralData } = useReferral(walletAddress)

    const referralLink = referralData?.referralLink ||
        `https://t.me/ChessDAObot?start=REF_${referralCode || 'CHESS'}`

    // Get appropriate share template
    const getShareData = () => {
        switch (type) {
            case 'victory':
                return SHARE_TEMPLATES.victory(stats, referralLink)
            case 'levelUp':
                return SHARE_TEMPLATES.levelUp(level, referralLink)
            case 'streak':
                return SHARE_TEMPLATES.streak(streakCount, referralLink)
            case 'achievement':
                return SHARE_TEMPLATES.achievement(achievement, referralLink)
            default:
                return SHARE_TEMPLATES.invite(referralLink)
        }
    }

    const shareData = getShareData()

    // Share via Telegram
    const handleShare = async () => {
        const fullText = `${shareData.text}\n${shareData.url}`

        if (isInTelegram && webApp) {
            // Use Telegram's native share
            webApp.openTelegramLink(
                `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`
            )
        } else if (navigator.share) {
            // Web Share API
            try {
                await navigator.share({
                    title: 'ChessDAO',
                    text: shareData.text,
                    url: shareData.url
                })
            } catch (err) {
                // User cancelled
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(fullText)
            alert('Link copied!')
        }
    }

    // Share to Telegram Stories (v7.8+)
    const handleShareToStory = async () => {
        if (!isInTelegram || !webApp) return

        // Check if shareToStory is available
        if (typeof webApp.shareToStory === 'function') {
            try {
                // Create a simple achievement image URL (could be dynamic)
                const mediaUrl = `https://chessdao-production.up.railway.app/api/og?type=${type}&level=${level}`

                await webApp.shareToStory(mediaUrl, {
                    text: shareData.text,
                    widget_link: {
                        url: shareData.url,
                        name: 'Play ChessDAO'
                    }
                })
            } catch (err) {
                console.error('Story share error:', err)
                // Fallback to regular share
                handleShare()
            }
        } else {
            // Fallback
            handleShare()
        }
    }

    // Compact single button
    if (compact) {
        return (
            <Button
                onClick={handleShare}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
                <Share2 className="w-4 h-4 mr-1" />
                Share
            </Button>
        )
    }

    // Full button set based on type
    const getButtonConfig = () => {
        switch (type) {
            case 'victory':
                return {
                    gradient: 'from-yellow-500 to-orange-500',
                    icon: Trophy,
                    label: 'Share Victory'
                }
            case 'levelUp':
                return {
                    gradient: 'from-green-500 to-emerald-500',
                    icon: TrendingUp,
                    label: 'Share Level Up'
                }
            case 'streak':
                return {
                    gradient: 'from-red-500 to-orange-500',
                    icon: Flame,
                    label: `Share ${streakCount}x Streak`
                }
            case 'achievement':
                return {
                    gradient: 'from-purple-500 to-pink-500',
                    icon: Sparkles,
                    label: 'Share Achievement'
                }
            default:
                return {
                    gradient: 'from-blue-500 to-purple-500',
                    icon: Share2,
                    label: 'Invite Friends'
                }
        }
    }

    const config = getButtonConfig()
    const Icon = config.icon

    return (
        <div className="flex gap-2">
            <Button
                onClick={handleShare}
                className={`flex-1 bg-gradient-to-r ${config.gradient} hover:opacity-90`}
            >
                <Icon className="w-4 h-4 mr-2" />
                {config.label}
            </Button>

            {isInTelegram && webApp?.shareToStory && (
                <Button
                    onClick={handleShareToStory}
                    variant="outline"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                >
                    <Camera className="w-4 h-4" />
                </Button>
            )}
        </div>
    )
}

/**
 * VictorySharePrompt - Shown after winning a game
 */
export function VictorySharePrompt({ stats, walletAddress, onDismiss }) {
    return (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏆</span>
                <div>
                    <h3 className="font-bold text-white">Victory!</h3>
                    <p className="text-sm text-yellow-200/70">Share to earn referral bonuses</p>
                </div>
            </div>
            <ShareButtons
                walletAddress={walletAddress}
                type="victory"
                stats={stats}
            />
            <button
                onClick={onDismiss}
                className="text-xs text-white/50 mt-2 hover:text-white/70"
            >
                Maybe later
            </button>
        </div>
    )
}

/**
 * LevelUpSharePrompt - Shown after upgrading level
 */
export function LevelUpSharePrompt({ level, walletAddress, onDismiss }) {
    const LEVEL_ICONS = {
        bronze: '🥉', silver: '🥈', gold: '🥇',
        platinum: '💎', diamond: '💠', master: '👑'
    }

    return (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{LEVEL_ICONS[level]}</span>
                <div>
                    <h3 className="font-bold text-white capitalize">Level Up: {level}!</h3>
                    <p className="text-sm text-green-200/70">Tell your friends about your progress</p>
                </div>
            </div>
            <ShareButtons
                walletAddress={walletAddress}
                type="levelUp"
                level={level}
            />
            <button
                onClick={onDismiss}
                className="text-xs text-white/50 mt-2 hover:text-white/70"
            >
                Skip
            </button>
        </div>
    )
}
