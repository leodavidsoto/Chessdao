'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    User,
    Users,
    Swords,
    Bell,
    Trophy,
    Gamepad2,
    TrendingUp,
    Settings,
    Edit,
    UserPlus,
    MessageCircle,
    Clock,
    Coins,
    ChevronRight,
    CheckCircle,
    XCircle,
    LogOut,
    ArrowLeftRight
} from 'lucide-react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useFriends } from '@/hooks/useFriends'
import { useChallenges } from '@/hooks/useChallenges'
import { useNotifications } from '@/hooks/useNotifications'
import { useGameTokens } from '@/hooks/useGameTokens'
import { useChessTokens } from '@/hooks/useChessTokens'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { useTonConnect } from '@/hooks/useTonConnect'
import ProfileEditor from './ProfileEditor'
import FriendsList from './FriendsList'
import ChallengeModal from './ChallengeModal'
import NotificationsPanel from './NotificationsPanel'
import TokenSwap from './TokenSwap'

export default function UserDashboard({ onBack }) {
    const { publicKey, connected, disconnect } = useWallet()

    // TON wallet for Telegram Mini App
    const { isInTelegram } = useTelegramWebApp()
    const { isConnected: tonConnected, address: tonAddress, actions: tonActions } = useTonConnect()

    // Determine if ANY wallet is connected
    const isWalletConnected = isInTelegram ? tonConnected : connected
    const walletAddress = isInTelegram ? tonAddress : publicKey?.toString()

    const { profile, loading: profileLoading, isNewUser } = useUserProfile()
    const { friends, onlineFriends, pendingIncoming, counts: friendCounts } = useFriends()
    const { incoming: pendingChallenges, actions: challengeActions } = useChallenges()
    const { unreadCount } = useNotifications()
    const { gameBalance } = useGameTokens()
    const { chessBalance } = useChessTokens()

    const [activeTab, setActiveTab] = useState('overview')
    const [showProfileEditor, setShowProfileEditor] = useState(false)
    const [showChallengeModal, setShowChallengeModal] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showSwap, setShowSwap] = useState(false)

    // Show profile editor for new users
    useEffect(() => {
        if (isNewUser && !profileLoading) {
            setShowProfileEditor(true)
        }
    }, [isNewUser, profileLoading])

    // Handle disconnect for both Solana and TON
    const handleDisconnect = () => {
        if (isInTelegram) {
            tonActions.disconnect()
        } else {
            disconnect()
        }
        onBack()
    }

    if (!isWalletConnected) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="bg-slate-800 border-slate-700 p-8 text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                    <h2 className="text-xl text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-slate-400">Connect your wallet to access your profile</p>
                    <Button onClick={onBack} className="mt-4">← Back</Button>
                </Card>
            </div>
        )
    }

    const stats = profile?.stats || { rating: 1200, gamesPlayed: 0, gamesWon: 0, winRate: 0 }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                            ← Volver
                        </Button>
                        <h1 className="text-3xl font-black text-white tracking-tight">Mi Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNotifications(true)}
                            className="relative text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <Card className="bg-gradient-to-br from-purple-900/70 to-indigo-900/70 border-purple-500/40 shadow-xl shadow-purple-900/20">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-4xl shadow-lg border-2 border-purple-300/30" style={{ width: '72px', height: '72px' }}>
                                        {profile?.profile?.avatar || '♟️'}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">
                                            {profile?.profile?.username || 'Nuevo Usuario'}
                                        </h2>
                                        <p className="text-sm text-purple-200/70 font-mono">
                                            {walletAddress?.slice(0, 8)}...
                                        </p>
                                        {profile?.status?.isOnline && (
                                            <Badge className="mt-1 bg-green-500 text-white font-semibold">🟢 Online</Badge>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowProfileEditor(true)}
                                    className="text-purple-200 hover:text-white hover:bg-purple-700/50"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>

                            {profile?.profile?.bio && (
                                <p className="text-sm text-purple-100 mb-4 leading-relaxed">
                                    {profile.profile.bio}
                                </p>
                            )}

                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-black/30 rounded-xl p-3 border border-purple-400/20">
                                    <div className="text-2xl font-black text-white">{friendCounts.friends || 0}</div>
                                    <div className="text-xs text-purple-200 font-medium">Amigos</div>
                                </div>
                                <div className="bg-black/30 rounded-xl p-3 border border-purple-400/20">
                                    <div className="text-2xl font-black text-white">{friendCounts.followers || 0}</div>
                                    <div className="text-xs text-purple-200 font-medium">Seguidores</div>
                                </div>
                                <div className="bg-black/30 rounded-xl p-3 border border-purple-400/20">
                                    <div className="text-2xl font-black text-white">{friendCounts.following || 0}</div>
                                    <div className="text-xs text-purple-200 font-medium">Siguiendo</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Card */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-400" />
                                Estadísticas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                    <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-400" />
                                    <div className="text-2xl font-bold text-white">{stats.rating}</div>
                                    <div className="text-xs text-slate-400">Rating ELO</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                    <Gamepad2 className="h-6 w-6 mx-auto mb-1 text-blue-400" />
                                    <div className="text-2xl font-bold text-white">{stats.gamesPlayed}</div>
                                    <div className="text-xs text-slate-400">Partidas</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                    <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-400" />
                                    <div className="text-2xl font-bold text-white">{stats.gamesWon}</div>
                                    <div className="text-xs text-slate-400">Victorias</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                    <TrendingUp className="h-6 w-6 mx-auto mb-1 text-purple-400" />
                                    <div className="text-2xl font-bold text-white">{stats.winRate}%</div>
                                    <div className="text-xs text-slate-400">Win Rate</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Balance Card */}
                    <Card className="bg-slate-800/80 border-slate-600/50 shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-white font-bold">
                                <Coins className="h-5 w-5 text-yellow-400" />
                                Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">🎮</span>
                                    <div>
                                        <div className="text-base font-bold text-yellow-300">$GAME</div>
                                        <div className="text-xs text-yellow-200/60">Para juegos</div>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-white">
                                    {gameBalance?.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/40 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Coins className="h-7 w-7 text-purple-300" />
                                    <div>
                                        <div className="text-base font-bold text-purple-300">CHESS</div>
                                        <div className="text-xs text-purple-200/60">Token real</div>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-white">
                                    {chessBalance?.toLocaleString() || 0}
                                </div>
                            </div>
                            {/* Exchange Rate */}
                            <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <ArrowLeftRight className="h-4 w-4 text-cyan-400" />
                                    <span className="text-slate-300">10 $GAME = 1 CHESS</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setShowSwap(true)}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                                >
                                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                                    Swap
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Challenges */}
                {pendingChallenges.length > 0 && (
                    <Card className="bg-orange-900/20 border-orange-700/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-orange-400">
                                <Swords className="h-5 w-5" />
                                Desafíos Pendientes ({pendingChallenges.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {pendingChallenges.slice(0, 3).map(challenge => (
                                    <div
                                        key={challenge.challengeId}
                                        className="bg-slate-800 rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                                                {challenge.challengerInfo?.avatar || '♟️'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">
                                                    {challenge.challengerInfo?.username || 'Unknown'}
                                                </div>
                                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                                    <span>⏱️ {challenge.timeControl}</span>
                                                    {challenge.betAmount > 0 && (
                                                        <span className="text-yellow-400">
                                                            🎮 {challenge.betAmount} $GAME
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => challengeActions.acceptChallenge(challenge.challengeId)}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Aceptar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-700 text-red-400 hover:bg-red-900/30"
                                                onClick={() => challengeActions.declineChallenge(challenge.challengeId)}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Friends Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Online Friends */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-green-400" />
                                    Amigos Online ({onlineFriends.length})
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveTab('friends')}
                                >
                                    Ver todos <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {onlineFriends.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No hay amigos online</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => setActiveTab('friends')}
                                    >
                                        <UserPlus className="h-4 w-4 mr-1" />
                                        Añadir amigos
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {onlineFriends.slice(0, 5).map(friend => (
                                        <div
                                            key={friend.walletAddress}
                                            className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                                                        {friend.avatar || '♟️'}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{friend.username}</div>
                                                    <div className="text-xs text-slate-400">{friend.rating} ELO</div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setShowChallengeModal(friend)
                                                }}
                                            >
                                                <Swords className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Friend Requests */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-blue-400" />
                                Solicitudes ({pendingIncoming.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingIncoming.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Sin solicitudes pendientes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pendingIncoming.slice(0, 5).map(request => (
                                        <div
                                            key={request.friendshipId}
                                            className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                                                    {request.avatar || '♟️'}
                                                </div>
                                                <div className="text-sm font-medium text-white">{request.username}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" className="text-green-400">
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-400">
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            {showProfileEditor && (
                <ProfileEditor
                    onClose={() => setShowProfileEditor(false)}
                    isNewUser={isNewUser}
                />
            )}

            {showChallengeModal && (
                <ChallengeModal
                    opponent={showChallengeModal}
                    onClose={() => setShowChallengeModal(false)}
                />
            )}

            {showNotifications && (
                <NotificationsPanel
                    onClose={() => setShowNotifications(false)}
                />
            )}

            {showSwap && (
                <TokenSwap
                    onClose={() => setShowSwap(false)}
                />
            )}
        </div>
    )
}
