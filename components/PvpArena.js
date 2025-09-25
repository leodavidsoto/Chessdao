'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Swords, Coins, Timer, Target, TrendingUp, User, Users, Crown, Zap } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useChessTokens } from '@/hooks/useChessTokens'

export default function PvpArena({ gameData, onBack }) {
  const { publicKey } = useWallet()
  const { socket, connected, onlineUsers, gameState, actions: socketActions } = useSocket()
  const { chessBalance, actions: { formatChessAmount } } = useChessTokens()
  
  const [betAmount, setBetAmount] = useState(100)
  const [timeControl, setTimeControl] = useState('10+0')
  const [gameTitle, setGameTitle] = useState('')
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [activeGames, setActiveGames] = useState([])
  const [waitingGames, setWaitingGames] = useState([])

  // Mock waiting games - in real app this would come from socket events
  useEffect(() => {
    setWaitingGames([
      {
        gameId: 'game_1',
        creator: { username: 'ChessNinja42', rating: 1850, avatar: '🥷' },
        betAmount: 150,
        timeControl: '15+10',
        title: 'Quick Battle',
        createdAt: new Date(Date.now() - 300000)
      },
      {
        gameId: 'game_2', 
        creator: { username: 'QueenHunter', rating: 1650, avatar: '👑' },
        betAmount: 75,
        timeControl: '10+0',
        title: 'Casual Game',
        createdAt: new Date(Date.now() - 180000)
      },
      {
        gameId: 'game_3',
        creator: { username: 'KnightStorm', rating: 2100, avatar: '⚡' },
        betAmount: 300,
        timeControl: '5+3',
        title: 'Blitz Master',
        createdAt: new Date(Date.now() - 120000)
      }
    ])
  }, [])

  const handleCreateMatch = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first')
      return
    }

    if (betAmount > chessBalance) {
      alert(`Insufficient CHESS tokens. You have ${formatChessAmount(chessBalance)}, need ${formatChessAmount(betAmount)}`)
      return
    }

    setWaitingForOpponent(true)
    
    const title = gameTitle || `${timeControl} Battle - ${betAmount} CHESS`
    
    socketActions.createPvpGame(betAmount, timeControl, title)
  }

  const handleJoinMatch = async (game) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first')
      return
    }

    if (game.betAmount > chessBalance) {
      alert(`Insufficient CHESS tokens. You have ${formatChessAmount(chessBalance)}, need ${formatChessAmount(game.betAmount)}`)
      return
    }

    socketActions.joinPvpGame(game.gameId)
  }

  const timeControlOptions = [
    { value: '3+0', label: '3 min' },
    { value: '5+3', label: '5+3' },
    { value: '10+0', label: '10 min' },
    { value: '15+10', label: '15+10' },
    { value: '30+0', label: '30 min' }
  ]

  const formatTimeAgo = (date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

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
            <p className="text-slate-400 text-sm flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {onlineUsers.length} players online
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!connected && (
        <Card className="bg-orange-900/20 border-orange-600 mb-6">
          <CardContent className="p-4">
            <p className="text-orange-300 text-sm">
              <Zap className="h-4 w-4 inline mr-2" />
              Connecting to game server...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Balance */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-yellow-400" />
              <span className="text-white">Available Balance:</span>
            </div>
            <div className="text-xl font-bold text-yellow-400">
              {formatChessAmount(chessBalance)} CHESS
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Match */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Create New Match
          </CardTitle>
          <CardDescription className="text-slate-400">
            Challenge other players with token bets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Game Title (Optional)</label>
            <Input
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="Enter a title for your game..."
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Bet Amount</label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min="1"
                  max={chessBalance}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <div className="flex items-center text-slate-400">
                  <Coins className="h-4 w-4 mr-1" />
                  <span className="text-sm">CHESS</span>
                </div>
              </div>
              {betAmount > chessBalance && (
                <p className="text-red-400 text-xs mt-1">Insufficient balance</p>
              )}
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
            disabled={waitingForOpponent || betAmount > chessBalance || betAmount < 1}
          >
            {waitingForOpponent ? (
              <>
                <Timer className="h-4 w-4 mr-2 animate-pulse" />
                Waiting for Opponent...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Create Match ({formatChessAmount(betAmount)} CHESS)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Available Matches */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Swords className="h-5 w-5 mr-2" />
          Available Matches
        </h3>
        
        {waitingGames.length === 0 ? (
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No matches available</p>
              <p className="text-slate-500 text-sm">Create a match to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {waitingGames.map((game) => (
              <Card 
                key={game.gameId}
                className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{game.creator.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-semibold">{game.creator.username}</span>
                          <Badge variant="outline" className="text-xs">
                            {game.creator.rating}
                          </Badge>
                          <span className="text-slate-400 text-xs">
                            {formatTimeAgo(game.createdAt)}
                          </span>
                        </div>
                        <div className="text-white text-sm mb-1">{game.title}</div>
                        <div className="flex items-center space-x-4 text-slate-400 text-sm">
                          <div className="flex items-center">
                            <Coins className="h-3 w-3 mr-1" />
                            {formatChessAmount(game.betAmount)} CHESS
                          </div>
                          <div className="flex items-center">
                            <Timer className="h-3 w-3 mr-1" />
                            {game.timeControl}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleJoinMatch(game)}
                      disabled={game.betAmount > chessBalance}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                    >
                      {game.betAmount > chessBalance ? 'Insufficient Funds' : 'Accept Challenge'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Player Stats */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Your PVP Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-green-400">12</div>
              <div className="text-sm text-slate-400">Wins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">8</div>
              <div className="text-sm text-slate-400">Losses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">+{formatChessAmount(450)}</div>
              <div className="text-sm text-slate-400">Net CHESS</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Rating</span>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-white font-semibold">1650</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-slate-400">Win Rate</span>
              <span className="text-white font-semibold">60%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}