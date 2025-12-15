'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gamepad2, Trophy, Coins, TrendingUp } from 'lucide-react'
import { apiFetch } from '@/lib/config'

export default function PlayerStats() {
    const { publicKey, connected } = useWallet()
    const [stats, setStats] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (connected && publicKey) {
            fetchStats()
        }
    }, [connected, publicKey])

    const fetchStats = async () => {
        try {
            setLoading(true)
            const walletAddress = publicKey.toString()

            // Fetch player stats
            const playersRes = await apiFetch('/api/players')
            const playersData = await playersRes.json()
            const player = playersData.players?.find(p => p.walletAddress === walletAddress)

            // Fetch transactions
            const txRes = await apiFetch(`/api/transactions?wallet=${walletAddress}&limit=5`)
            const txData = await txRes.json()

            if (player) {
                setStats({
                    gamesPlayed: player.gamesPlayed || 0,
                    gamesWon: player.gamesWon || 0,
                    rating: player.rating || 1200,
                    tokensEarned: player.tokensEarned || 0,
                    winRate: player.gamesPlayed > 0
                        ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
                        : 0
                })
            } else {
                // New player defaults
                setStats({
                    gamesPlayed: 0,
                    gamesWon: 0,
                    rating: 1200,
                    tokensEarned: 0,
                    winRate: 0
                })
            }

            setTransactions(txData.transactions || [])
        } catch (error) {
            console.error('Failed to fetch stats:', error)
            setStats({
                gamesPlayed: 0,
                gamesWon: 0,
                rating: 1200,
                tokensEarned: 0,
                winRate: 0
            })
        } finally {
            setLoading(false)
        }
    }

    if (!connected) {
        return null
    }

    if (loading) {
        return (
            <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Your Stats
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <Gamepad2 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                        <div className="text-2xl font-bold">{stats?.gamesPlayed || 0}</div>
                        <div className="text-xs text-slate-400">Games</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                        <div className="text-2xl font-bold">{stats?.gamesWon || 0}</div>
                        <div className="text-xs text-slate-400">Wins</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-400">{stats?.rating || 1200}</div>
                        <div className="text-xs text-slate-400">Rating</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">{stats?.winRate || 0}%</div>
                        <div className="text-xs text-slate-400">Win Rate</div>
                    </div>
                </div>

                {transactions.length > 0 && (
                    <div className="mt-4">
                        <div className="text-sm font-medium text-slate-300 mb-2">Recent Activity</div>
                        <div className="space-y-1">
                            {transactions.slice(0, 3).map((tx, idx) => (
                                <div key={idx} className="flex justify-between text-xs bg-slate-700/30 rounded px-2 py-1">
                                    <span className={tx.type === 'win' ? 'text-green-400' : 'text-slate-300'}>
                                        {tx.type === 'purchase' && '💰'}
                                        {tx.type === 'win' && '🏆'}
                                        {tx.type === 'bet' && '🎲'}
                                        {' '}{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                    </span>
                                    <span className={tx.type === 'bet' ? 'text-red-400' : 'text-green-400'}>
                                        {tx.type === 'bet' ? '-' : '+'}{tx.amount} CHESS
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
