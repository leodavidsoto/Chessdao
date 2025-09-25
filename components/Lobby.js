'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Swords, Users, Plus, TrendingUp, Clock, Coins, Zap, Trophy, Target } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useChessTokens } from '@/hooks/useChessTokens'

export default function Lobby({ onGameSelect }) {
  const { publicKey } = useWallet()
  const { connected, onlineUsers, actions: socketActions } = useSocket()
  const { chessBalance, actions: { formatChessAmount } } = useChessTokens()
  
  const [activeGames] = useState([
    {
      id: 1,
      type: 'community',
      title: 'Grand Master Challenge',
      players: 156,
      pot: 5000,
      timeLeft: '2h 30m',
      status: 'voting',
      description: 'Vote for the next move in this epic battle!'
    },
    {
      id: 2,
      type: 'community',
      title: 'Beginner Friendly DAO',
      players: 43,
      pot: 1200,
      timeLeft: '45m',
      status: 'playing',
      description: 'Learning chess through democracy'
    }
  ])

  const [pvpMatches] = useState([
    {
      id: 'pvp_1',
      creator: 'ChessNinja42',
      rating: 1850,
      betAmount: 150,
      timeControl: '15+10',
      title: 'Quick Battle',
      avatar: '🥷',
      createdAt: new Date(Date.now() - 300000)
    },
    {
      id: 'pvp_2',
      creator: 'QueenHunter', 
      rating: 1650,
      betAmount: 75,
      timeControl: '10+0',
      title: 'Casual Game',
      avatar: '👑',
      createdAt: new Date(Date.now() - 180000)
    }
  ])

  const handleCreateGame = (type) => {
    if (!connected) {
      alert('Please connect your wallet and wait for connection')
      return
    }

    const newGame = {
      id: Date.now(),
      type,
      title: type === 'community' ? 'New Community Game' : 'New PVP Battle',
      created: new Date()
    }
    onGameSelect(type, newGame)
  }

  const handleJoinGame = (game) => {
    if (game.type === 'pvp') {
      // Join via socket for PVP games
      if (connected) {
        socketActions.joinPvpGame(game.id)
      } else {
        alert('Please wait for connection to game server')
      }
    } else {
      // Navigate to community game
      onGameSelect(game.type, game)
    }
  }

  const formatTimeAgo = (date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Game Lobby</h2>
        <p className="text-slate-400">Choose your chess adventure</p>
      </div>

      {/* Player Status */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                🎮
              </div>
              <div>
                <div className="text-white font-semibold">
                  {publicKey ? `Player_${publicKey.toString().slice(0, 8)}` : 'Guest'}
                </div>
                <div className="text-slate-400 text-sm flex items-center space-x-3">
                  <span>Rating: 1650</span>
                  <span>•</span>
                  <span className={`flex items-center ${connected ? 'text-green-400' : 'text-orange-400'}`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${connected ? 'bg-green-400' : 'bg-orange-400'}`} />
                    {connected ? 'Online' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-semibold">
                {formatChessAmount(chessBalance)} CHESS
              </div>
              <div className="text-slate-400 text-sm">Available Balance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Game */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Create New Game
        </h3>
        <div className="grid gap-4">
          {/* Community DAO Game */}
          <Card 
            className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer group"
            onClick={() => handleCreateGame('community')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Crown className="h-6 w-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <CardTitle className="text-white">Community DAO Game</CardTitle>
                    <CardDescription className="text-slate-300">
                      Democratic chess with token voting
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-semibold">FREE</div>
                  <div className="text-slate-400 text-xs">Earn rewards</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* PVP Battle */}
          <Card 
            className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer group"
            onClick={() => handleCreateGame('pvp')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Swords className="h-6 w-6 text-red-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <CardTitle className="text-white">PVP Battle</CardTitle>
                    <CardDescription className="text-slate-300">
                      Challenge players with token bets
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-semibold flex items-center">
                    <Coins className="h-4 w-4 mr-1" />
                    BET
                  </div>
                  <div className="text-slate-400 text-xs">Winner takes all</div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Community Games */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Crown className="h-5 w-5 mr-2 text-yellow-400" />
          Community DAO Games
        </h3>
        <div className="space-y-4">
          {activeGames.filter(game => game.type === 'community').map((game) => (
            <Card 
              key={game.id}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
              onClick={() => handleJoinGame(game)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    <div className="flex-1">
                      <CardTitle className="text-white text-base">{game.title}</CardTitle>
                      <p className="text-slate-400 text-sm">{game.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-slate-400 text-sm">
                          <Users className="h-4 w-4 mr-1" />
                          {game.players} players
                        </div>
                        <div className="flex items-center text-slate-400 text-sm">
                          <Coins className="h-4 w-4 mr-1" />
                          {formatChessAmount(game.pot)} CHESS pot
                        </div>
                        <div className="flex items-center text-slate-400 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          {game.timeLeft}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={
                        game.status === 'voting' ? 'bg-yellow-500' :
                        game.status === 'playing' ? 'bg-green-500' :
                        'bg-blue-500'
                      }
                    >
                      {game.status}
                    </Badge>
                    <Target className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* PVP Matches */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Swords className="h-5 w-5 mr-2 text-red-400" />
          Available PVP Matches
        </h3>
        <div className="space-y-3">
          {pvpMatches.map((match) => (
            <Card 
              key={match.id}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
              onClick={() => handleJoinGame(match)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{match.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-semibold">{match.creator}</span>
                        <Badge variant="outline" className="text-xs">
                          {match.rating}
                        </Badge>
                        <span className="text-slate-400 text-xs">
                          {formatTimeAgo(match.createdAt)}
                        </span>
                      </div>
                      <div className="text-white text-sm mb-1">{match.title}</div>
                      <div className="flex items-center space-x-4 text-slate-400 text-sm">
                        <div className="flex items-center">
                          <Coins className="h-3 w-3 mr-1" />
                          {formatChessAmount(match.betAmount)} CHESS
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {match.timeControl}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={match.betAmount > chessBalance}
                  >
                    {match.betAmount > chessBalance ? 'Insufficient Funds' : 'Accept'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lobby Stats */}
      <div className="pt-6 border-t border-slate-600">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center space-x-1 text-slate-300">
              <Users className="h-4 w-4" />
              <span className="text-2xl font-bold text-white">{onlineUsers.length}</span>
            </div>
            <div className="text-sm text-slate-400">Players Online</div>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-1 text-slate-300">
              <Trophy className="h-4 w-4" />
              <span className="text-2xl font-bold text-white">
                {activeGames.length + pvpMatches.length}
              </span>
            </div>
            <div className="text-sm text-slate-400">Active Games</div>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-1 text-slate-300">
              <Coins className="h-4 w-4" />
              <span className="text-2xl font-bold text-white">
                {formatChessAmount(
                  activeGames.reduce((sum, game) => sum + game.pot, 0) +
                  pvpMatches.reduce((sum, match) => sum + match.betAmount, 0)
                )}
              </span>
            </div>
            <div className="text-sm text-slate-400">Total Pot</div>
          </div>
        </div>
      </div>
    </div>
  )
}