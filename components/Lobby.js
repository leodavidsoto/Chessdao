'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Swords, Users, Plus, TrendingUp, Clock, Coins } from 'lucide-react'

export default function Lobby({ onGameSelect }) {
  const [activeGames] = useState([
    {
      id: 1,
      type: 'community',
      title: 'Grand Master Challenge',
      players: 156,
      pot: 5000,
      timeLeft: '2h 30m',
      status: 'voting'
    },
    {
      id: 2,
      type: 'pvp',
      title: 'Quick Battle',
      bet: 100,
      opponent: 'ChessNinja42',
      rating: 1850,
      timeControl: '10+0'
    },
    {
      id: 3,
      type: 'community',
      title: 'Beginner Friendly',
      players: 43,
      pot: 1200,
      timeLeft: '45m',
      status: 'playing'
    }
  ])

  const handleCreateGame = (type) => {
    const newGame = {
      id: Date.now(),
      type,
      title: type === 'community' ? 'New Community Game' : 'New PVP Battle',
      created: new Date()
    }
    onGameSelect(type, newGame)
  }

  const handleJoinGame = (game) => {
    onGameSelect(game.type, game)
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Game Lobby</h2>
        <p className="text-slate-400">Choose your chess adventure</p>
      </div>

      {/* Create New Game */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Create New Game</h3>
        <div className="grid gap-4">
          <Card 
            className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
            onClick={() => handleCreateGame('community')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  <div>
                    <CardTitle className="text-white">Community DAO Game</CardTitle>
                    <CardDescription className="text-slate-300">
                      Democratic chess with token voting
                    </CardDescription>
                  </div>
                </div>
                <Plus className="h-5 w-5 text-slate-400" />
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
            onClick={() => handleCreateGame('pvp')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Swords className="h-6 w-6 text-red-400" />
                  <div>
                    <CardTitle className="text-white">PVP Battle</CardTitle>
                    <CardDescription className="text-slate-300">
                      Challenge players with token bets
                    </CardDescription>
                  </div>
                </div>
                <Plus className="h-5 w-5 text-slate-400" />
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Active Games */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Active Games</h3>
        <div className="space-y-4">
          {activeGames.map((game) => (
            <Card 
              key={game.id}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
              onClick={() => handleJoinGame(game)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {game.type === 'community' ? (
                      <Crown className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <Swords className="h-5 w-5 text-red-400" />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-white text-base">{game.title}</CardTitle>
                      <div className="flex items-center space-x-4 mt-1">
                        {game.type === 'community' ? (
                          <>
                            <div className="flex items-center text-slate-400 text-sm">
                              <Users className="h-4 w-4 mr-1" />
                              {game.players} players
                            </div>
                            <div className="flex items-center text-slate-400 text-sm">
                              <Coins className="h-4 w-4 mr-1" />
                              {game.pot} CHESS
                            </div>
                            <div className="flex items-center text-slate-400 text-sm">
                              <Clock className="h-4 w-4 mr-1" />
                              {game.timeLeft}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center text-slate-400 text-sm">
                              <Coins className="h-4 w-4 mr-1" />
                              {game.bet} CHESS bet
                            </div>
                            <div className="text-slate-400 text-sm">
                              vs {game.opponent} ({game.rating})
                            </div>
                            <div className="text-slate-400 text-sm">
                              {game.timeControl}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {game.status && (
                      <Badge 
                        className={
                          game.status === 'voting' ? 'bg-yellow-500' :
                          game.status === 'playing' ? 'bg-green-500' :
                          'bg-blue-500'
                        }
                      >
                        {game.status}
                      </Badge>
                    )}
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 pt-6 border-t border-slate-600">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">127</div>
            <div className="text-sm text-slate-400">Active Players</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">15.2K</div>
            <div className="text-sm text-slate-400">Total Pot</div>
          </div>
        </div>
      </div>
    </div>
  )
}