'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Bot, ChevronLeft, Trophy, Clock } from 'lucide-react'

export default function AIGame({ gameData, onBack }) {
  const [aiDifficulty, setAiDifficulty] = useState(gameData?.difficulty || 'medium')
  const [gameStatus, setGameStatus] = useState('active')
  const [moveCount, setMoveCount] = useState(0)

  const difficulties = {
    easy: { name: 'Easy', elo: '1200', depth: 5 },
    medium: { name: 'Medium', elo: '1600', depth: 10 },
    hard: { name: 'Hard', elo: '2000', depth: 15 },
    master: { name: 'Master', elo: '2400', depth: 20 }
  }

  const currentDiff = difficulties[aiDifficulty]

  return (
    <div className="h-full flex flex-col bg-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-3 text-slate-300 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Lobby
        </Button>
        
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Opponent</h2>
            <p className="text-sm text-slate-400">Playing against {currentDiff.name}</p>
          </div>
        </div>
      </div>

      {/* AI Info */}
      <div className="p-4 space-y-4">
        <Card className="bg-slate-700 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center">
              <Bot className="h-5 w-5 mr-2 text-blue-400" />
              Opponent Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Difficulty:</span>
              <span className="text-white font-semibold">{currentDiff.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Estimated Rating:</span>
              <span className="text-yellow-400 font-semibold">{currentDiff.elo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Search Depth:</span>
              <span className="text-blue-400 font-semibold">{currentDiff.depth} moves</span>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Selector */}
        {gameStatus === 'active' && moveCount === 0 && (
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Change Difficulty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(difficulties).map((key) => (
                <Button
                  key={key}
                  onClick={() => setAiDifficulty(key)}
                  variant={aiDifficulty === key ? 'default' : 'outline'}
                  className={`w-full justify-between ${
                    aiDifficulty === key
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  <span>{difficulties[key].name}</span>
                  <span className="text-xs">{difficulties[key].elo} ELO</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Game Stats */}
        <Card className="bg-slate-700 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
              Game Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Moves Played:</span>
              <span className="text-white font-semibold">{moveCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Status:</span>
              <span className="text-green-400 font-semibold capitalize">{gameStatus}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Tips</h3>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• AI uses Stockfish chess engine</li>
              <li>• Higher difficulty means deeper analysis</li>
              <li>• Practice different strategies</li>
              <li>• No tokens at stake - just practice!</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
