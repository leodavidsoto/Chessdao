'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Crown, Star } from 'lucide-react'

export default function Leaderboard() {
    const { publicKey } = useWallet()
    const [leaderboard, setLeaderboard] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState('rating')

    useEffect(() => {
        fetchLeaderboard()
    }, [sortBy])

    const fetchLeaderboard = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/leaderboard?type=${sortBy}&limit=20`)
            const data = await res.json()
            setLeaderboard(data.leaderboard || [])
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRankIcon = (rank) => {
        switch (rank) {
            case 1:
                return <Crown className="w-5 h-5 text-yellow-400" />
            case 2:
                return <Medal className="w-5 h-5 text-gray-300" />
            case 3:
                return <Medal className="w-5 h-5 text-amber-600" />
            default:
                return <span className="w-5 text-center text-slate-400">{rank}</span>
        }
    }

    const isCurrentUser = (walletAddress) => {
        return publicKey && publicKey.toString() === walletAddress
    }

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        Leaderboard
                    </CardTitle>
                    <div className="flex gap-1">
                        {['rating', 'wins', 'tokens'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setSortBy(type)}
                                className={`px-2 py-1 text-xs rounded ${sortBy === type
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((player, idx) => (
                                <div
                                    key={player.walletAddress || idx}
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isCurrentUser(player.walletAddress)
                                            ? 'bg-purple-600/30 border border-purple-500'
                                            : 'bg-slate-700/50 hover:bg-slate-700'
                                        }`}
                                >
                                    <div className="w-6 flex justify-center">
                                        {getRankIcon(player.rank)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">
                                                {player.username}
                                            </span>
                                            {isCurrentUser(player.walletAddress) && (
                                                <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                                                    You
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {player.gamesWon} wins • {player.winRate}% win rate
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">
                                            {sortBy === 'rating' && player.rating}
                                            {sortBy === 'wins' && player.gamesWon}
                                            {sortBy === 'tokens' && `${(player.tokensEarned || 0).toLocaleString()}`}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {sortBy === 'rating' && 'ELO'}
                                            {sortBy === 'wins' && 'wins'}
                                            {sortBy === 'tokens' && 'CHESS'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
