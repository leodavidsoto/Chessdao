'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Crown, Vote, Coins, Users, Clock, TrendingUp } from 'lucide-react'

export default function CommunityGame({ gameData, onBack }) {
  const [proposedMoves, setProposedMoves] = useState([
    { move: 'e4', votes: 45, percentage: 35, voter: 'ChessMaster99', tokens: 150 },
    { move: 'd4', votes: 38, percentage: 30, voter: 'QueenSlayer', tokens: 200 },
    { move: 'Nf3', votes: 25, percentage: 20, voter: 'KnightRider', tokens: 100 },
    { move: 'c4', votes: 20, percentage: 15, voter: 'PawnStorm', tokens: 75 }
  ])
  
  const [myVote, setMyVote] = useState(null)
  const [tokensBet, setTokensBet] = useState(50)
  const [timeLeft, setTimeLeft] = useState(150) // 2.5 minutes in seconds
  const [newMove, setNewMove] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleVote = (move) => {
    if (myVote === move) return // Already voted for this move
    
    setMyVote(move)
    // In real app, this would call smart contract to vote
    console.log(`Voted for ${move} with ${tokensBet} tokens`)
  }

  const handleProposeMove = () => {
    if (!newMove.trim()) return
    
    const newProposal = {
      move: newMove,
      votes: 1,
      percentage: 1,
      voter: 'You',
      tokens: tokensBet
    }
    
    setProposedMoves(prev => [...prev, newProposal])
    setNewMove('')
    setMyVote(newMove)
  }

  const totalVotes = proposedMoves.reduce((sum, move) => sum + move.votes, 0)

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
          <Crown className="h-6 w-6 text-yellow-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Community DAO Game</h2>
            <p className="text-slate-400 text-sm">
              {gameData?.title || 'Democratic Chess Voting'}
            </p>
          </div>
        </div>
      </div>

      {/* Voting Timer */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white text-lg">Voting Phase</CardTitle>
            </div>
            <Badge className="bg-blue-500 text-white text-lg px-3 py-1">
              {formatTime(timeLeft)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={(150 - timeLeft) / 150 * 100} className="h-2" />
          <p className="text-slate-400 text-sm mt-2">
            Vote for the next move with your CHESS tokens
          </p>
        </CardContent>
      </Card>

      {/* Current Proposals */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Proposed Moves</h3>
        <div className="space-y-3">
          {proposedMoves.map((move, index) => (
            <Card 
              key={index}
              className={`border-slate-600 transition-colors cursor-pointer ${
                myVote === move.move 
                  ? 'bg-green-800 border-green-600' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              onClick={() => handleVote(move.move)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl font-bold text-white bg-slate-800 rounded px-3 py-1">
                      {move.move}
                    </div>
                    <div className="text-sm text-slate-400">
                      by {move.voter}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Vote className="h-4 w-4" />
                      <span>{move.votes}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Coins className="h-4 w-4" />
                      <span>{move.tokens}</span>
                    </div>
                    <Badge variant="outline" className="text-white">
                      {move.percentage}%
                    </Badge>
                  </div>
                </div>
                <Progress value={move.percentage} className="h-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Propose New Move */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Propose a New Move</CardTitle>
          <CardDescription className="text-slate-400">
            Suggest your own move for the community to vote on
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Enter move (e.g., e4, Nf3, O-O)"
              value={newMove}
              onChange={(e) => setNewMove(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Input
              type="number"
              placeholder="Tokens"
              value={tokensBet}
              onChange={(e) => setTokensBet(Number(e.target.value))}
              className="bg-slate-700 border-slate-600 text-white w-24"
            />
          </div>
          <Button 
            onClick={handleProposeMove}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!newMove.trim()}
          >
            <Vote className="h-4 w-4 mr-2" />
            Propose Move ({tokensBet} CHESS)
          </Button>
        </CardContent>
      </Card>

      {/* Game Stats */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Game Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-300">
                <Users className="h-4 w-4" />
                <span className="text-2xl font-bold text-white">{totalVotes}</span>
              </div>
              <div className="text-sm text-slate-400">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-300">
                <Coins className="h-4 w-4" />
                <span className="text-2xl font-bold text-white">2,450</span>
              </div>
              <div className="text-sm text-slate-400">CHESS in Pot</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}