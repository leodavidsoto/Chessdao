'use client'

import { useState } from 'react'
import { useSquads } from '@/hooks/useSquads'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Users,
    Trophy,
    Crown,
    ChevronRight,
    Plus,
    LogOut,
    Loader2,
    Medal,
    Flame
} from 'lucide-react'

const SQUAD_AVATARS = ['🏆', '⚔️', '🔥', '💎', '👑', '🎮', '🚀', '⭐', '🦁', '🐉']

/**
 * SquadsPanel - Squad management and leaderboard
 */
export default function SquadsPanel({ walletAddress, onClose }) {
    const { mySquad, myMembership, leaderboard, loading, error, isInSquad, actions } = useSquads(walletAddress)
    const { isInTelegram, actions: tgActions } = useTelegramWebApp()

    const [showCreate, setShowCreate] = useState(false)
    const [squadName, setSquadName] = useState('')
    const [squadAvatar, setSquadAvatar] = useState('🏆')
    const [creating, setCreating] = useState(false)
    const [joining, setJoining] = useState(null)

    const handleCreate = async () => {
        if (!squadName.trim()) return
        setCreating(true)
        const result = await actions.create(squadName, '', squadAvatar)
        setCreating(false)
        if (result?.success) {
            setShowCreate(false)
            setSquadName('')
            if (isInTelegram) tgActions.hapticFeedback('success')
        }
    }

    const handleJoin = async (squadId) => {
        setJoining(squadId)
        const result = await actions.join(squadId)
        setJoining(null)
        if (result?.success && isInTelegram) {
            tgActions.hapticFeedback('success')
        }
    }

    const handleLeave = async () => {
        if (confirm('¿Seguro que quieres salir del squad?')) {
            await actions.leave()
        }
    }

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />
        if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />
        return <span className="text-slate-400 font-bold">#{rank}</span>
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-slate-900 border-purple-500/30 max-h-[85vh] overflow-hidden flex flex-col">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8" />
                            <CardTitle className="text-2xl">Squads</CardTitle>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">
                            ✕
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading && !mySquad && leaderboard.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        </div>
                    ) : (
                        <>
                            {/* My Squad Section */}
                            {isInSquad ? (
                                <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{mySquad.avatar}</span>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">{mySquad.name}</h3>
                                                    <p className="text-purple-300 text-sm">{mySquad.memberCount} miembros</p>
                                                </div>
                                            </div>
                                            {myMembership?.role === 'admin' && (
                                                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                                                    Admin
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-xl font-bold text-white">{mySquad.totalScore?.toLocaleString() || 0}</div>
                                                <div className="text-xs text-slate-400">Puntos</div>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-xl font-bold text-white">{mySquad.totalGames || 0}</div>
                                                <div className="text-xs text-slate-400">Partidas</div>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-xl font-bold text-white">{mySquad.totalWins || 0}</div>
                                                <div className="text-xs text-slate-400">Victorias</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleLeave}
                                                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                                            >
                                                <LogOut className="w-4 h-4 mr-1" />
                                                Salir
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            >
                                                Ver Squad
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : showCreate ? (
                                /* Create Squad Form */
                                <Card className="bg-slate-800/80 border-slate-700">
                                    <CardContent className="p-4 space-y-4">
                                        <h3 className="text-lg font-bold text-white">Crear Squad</h3>

                                        <div>
                                            <label className="text-sm text-slate-400 block mb-2">Avatar</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {SQUAD_AVATARS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => setSquadAvatar(emoji)}
                                                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${squadAvatar === emoji
                                                                ? 'bg-purple-600 scale-110'
                                                                : 'bg-slate-700 hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm text-slate-400 block mb-2">Nombre del Squad</label>
                                            <Input
                                                value={squadName}
                                                onChange={(e) => setSquadName(e.target.value)}
                                                placeholder="Ej: Los Maestros"
                                                className="bg-slate-700 border-slate-600"
                                                maxLength={30}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowCreate(false)}
                                                className="flex-1"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                onClick={handleCreate}
                                                disabled={creating || !squadName.trim()}
                                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                                            >
                                                {creating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <Plus className="w-4 h-4 mr-2" />
                                                )}
                                                Crear
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                /* No Squad - Show create button */
                                <Card className="bg-slate-800/50 border-slate-700 border-dashed">
                                    <CardContent className="p-6 text-center">
                                        <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                                        <h3 className="text-lg font-semibold text-white mb-2">No estás en un Squad</h3>
                                        <p className="text-slate-400 text-sm mb-4">
                                            Únete a un squad para competir en equipo y ganar más recompensas
                                        </p>
                                        <Button
                                            onClick={() => setShowCreate(true)}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear Squad
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Leaderboard */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                    <h3 className="text-lg font-bold text-white">Top Squads</h3>
                                </div>

                                <div className="space-y-2">
                                    {leaderboard.map((squad) => (
                                        <Card
                                            key={squad._id}
                                            className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all ${mySquad?._id === squad._id ? 'border-purple-500' : ''
                                                }`}
                                        >
                                            <CardContent className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 flex justify-center">
                                                        {getRankIcon(squad.rank)}
                                                    </div>
                                                    <span className="text-2xl">{squad.avatar}</span>
                                                    <div>
                                                        <div className="font-semibold text-white">{squad.name}</div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-2">
                                                            <span>{squad.memberCount} 👥</span>
                                                            <span className="flex items-center gap-1">
                                                                <Flame className="w-3 h-3 text-orange-400" />
                                                                {squad.weeklyScore || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-yellow-400">{squad.totalScore?.toLocaleString() || 0}</div>
                                                    <div className="text-xs text-slate-400">puntos</div>
                                                    {!isInSquad && mySquad?._id !== squad._id && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleJoin(squad._id)}
                                                            disabled={joining === squad._id}
                                                            className="mt-1 h-7 text-xs"
                                                        >
                                                            {joining === squad._id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                'Unirme'
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {leaderboard.length === 0 && !loading && (
                                        <p className="text-center text-slate-400 py-4">
                                            No hay squads aún. ¡Sé el primero en crear uno!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
