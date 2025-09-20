'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Swords, Coins, Timer, Target, TrendingUp, User } from 'lucide-react'

export default function PvpArena({ gameData, onBack }) {
  const [betAmount, setBetAmount] = useState(100)
  const [timeControl, setTimeControl] = useState('10+0')
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [openMatches, setOpenMatches] = useState([
    {
      id: 1,
      player: 'ChessNinja42',
      rating: 1850,
      bet: 150,
      timeControl: '15+10',
      avatar: '🥷'
    },
    {
      id: 2,
      player: 'QueenHunter',
      rating: 1650,
      bet: 75,
      timeControl: '10+0',
      avatar: '👑'
    },
    {
      id: 3,
      player: 'KnightStorm',
      rating: 2100,
      bet: 300,
      timeControl: '5+3',
      avatar: '⚡'
    },
    {
      id: 4,
      player: 'RookCastle',
      rating: 1750,
      bet: 200,
      timeControl: '20+5',
      avatar: '🏰'
    }
  ])

  const handleCreateMatch = () => {
    setWaitingForOpponent(true)
    // In real app, this would create a match on blockchain
    console.log(`Creating match with ${betAmount} CHESS bet, ${timeControl} time control`)
  }

  const handleJoinMatch = (match) => {
    // In real app, this would join the match and transfer tokens
    console.log(`Joining match against ${match.player} for ${match.bet} CHESS`)
  }

  const timeControlOptions = [
    { value: '3+0', label: '3 min' },
    { value: '5+3', label: '5+3' },
    { value: '10+0', label: '10 min' },
    { value: '15+10', label: '15+10' },
    { value: '30+0', label: '30 min' }
  ]

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-slate-400 hover:text-white mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3">
          <Swords className="h-6 w-6 text-red-400" />
          <div>
            <h2 className="text-xl font-bold text-white">PVP Battle Arena</h2>
            <p className="text-slate-400 text-sm">
              Challenge players with token bets
            </p>
          </div>
        </div>
      </div>

      {/* Create New Match */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Create New Match</CardTitle>
          <CardDescription className="text-slate-400">
            Set your bet and challenge other players
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Bet Amount</label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <div className="flex items-center text-slate-400">
                  <Coins className="h-4 w-4 mr-1" />
                  <span className="text-sm">CHESS</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Time Control</label>
              <select
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value)}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
              >
                {timeControlOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <Button 
            onClick={handleCreateMatch}
            className="w-full bg-red-600 hover:bg-red-700"
            disabled={waitingForOpponent}
          >
            {waitingForOpponent ? (
              <>
                <Timer className="h-4 w-4 mr-2 animate-pulse" />
                Waiting for Opponent...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Create Match ({betAmount} CHESS)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Open Matches to Join */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Open Matches</h3>
        <div className="space-y-3">
          {openMatches.map((match) => (
            <Card 
              key={match.id}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{match.avatar}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">{match.player}</span>
                        <Badge variant="outline" className="text-xs">
                          {match.rating}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3 text-slate-400 text-sm">
                        <div className="flex items-center">
                          <Coins className="h-3 w-3 mr-1" />
                          {match.bet} CHESS
                        </div>
                        <div className="flex items-center">
                          <Timer className="h-3 w-3 mr-1" />
                          {match.timeControl}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleJoinMatch(match)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* My Active Matches */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardHeader>
          <CardTitle className="text-white">My Active Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No active matches</p>
            <p className="text-slate-500 text-sm">Create or join a match to get started</p>
          </div>
        </CardContent>
      </Card>

      {/* PVP Stats */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Your PVP Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">12</div>
              <div className="text-sm text-slate-400">Wins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">8</div>
              <div className="text-sm text-slate-400">Losses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">+450</div>
              <div className="text-sm text-slate-400">Net CHESS</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Rating</span>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-white font-semibold">1650</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}