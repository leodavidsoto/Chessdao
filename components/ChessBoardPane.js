'use client'

import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Users, Swords, Clock, RotateCcw } from 'lucide-react'

export default function ChessBoardPane({ gameMode, gameData }) {
  const [game, setGame] = useState(new Chess())
  const [boardPosition, setBoardPosition] = useState(game.fen())
  const [gameStatus, setGameStatus] = useState('active')
  const [moveHistory, setMoveHistory] = useState([])
  const [boardOrientation, setBoardOrientation] = useState('white')

  useEffect(() => {
    // Reset game when mode changes
    const newGame = new Chess()
    setGame(newGame)
    setBoardPosition(newGame.fen())
    setMoveHistory([])
    setGameStatus('active')
  }, [gameMode])

  const makeMove = (sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // always promote to queen for simplicity
      })

      if (move) {
        const newGame = new Chess(game.fen())
        setGame(newGame)
        setBoardPosition(newGame.fen())
        setMoveHistory(prev => [...prev, move])

        // Check for game end
        if (newGame.isGameOver()) {
          if (newGame.isCheckmate()) {
            setGameStatus('checkmate')
          } else if (newGame.isDraw()) {
            setGameStatus('draw')
          }
        }
        return true
      }
    } catch (error) {
      console.log('Invalid move:', error)
    }
    return false
  }

  const resetGame = () => {
    const newGame = new Chess()
    setGame(newGame)
    setBoardPosition(newGame.fen())
    setMoveHistory([])
    setGameStatus('active')
  }

  const flipBoard = () => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
  }

  const getModeInfo = () => {
    switch (gameMode) {
      case 'community':
        return {
          icon: <Crown className="h-5 w-5 text-yellow-400" />,
          title: 'Community DAO Game',
          description: 'Vote on moves with the community',
          badge: 'DAO Mode',
          badgeColor: 'bg-yellow-500'
        }
      case 'pvp':
        return {
          icon: <Swords className="h-5 w-5 text-red-400" />,
          title: 'PVP Battle Arena',
          description: 'Compete against other players',
          badge: 'Betting Mode',
          badgeColor: 'bg-red-500'
        }
      default:
        return {
          icon: <Users className="h-5 w-5 text-blue-400" />,
          title: 'Practice Mode',
          description: 'Practice your chess skills',
          badge: 'Practice',
          badgeColor: 'bg-blue-500'
        }
    }
  }

  const modeInfo = getModeInfo()

  return (
    <div className="max-w-4xl w-full">
      {/* Game Header */}
      <Card className="bg-slate-800 border-slate-600 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {modeInfo.icon}
              <div>
                <CardTitle className="text-white">{modeInfo.title}</CardTitle>
                <p className="text-slate-400 text-sm">{modeInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${modeInfo.badgeColor} text-white`}>
                {modeInfo.badge}
              </Badge>
              {gameMode !== 'lobby' && (
                <div className="flex items-center space-x-2 text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">10:00</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chess Board */}
      <div className="flex gap-6">
        <div className="flex-1">
          <Card className="bg-slate-800 border-slate-600 p-4">
            <div className="aspect-square">
              <Chessboard
                position={boardPosition}
                onPieceDrop={makeMove}
                boardOrientation={boardOrientation}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#4B5563' }}
                customLightSquareStyle={{ backgroundColor: '#D1D5DB' }}
              />
            </div>
            
            {/* Board Controls */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={flipBoard}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Flip Board
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={resetGame}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  New Game
                </Button>
              </div>
              
              {gameStatus !== 'active' && (
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  {gameStatus === 'checkmate' ? 'Checkmate!' : 'Draw!'}
                </Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Move History */}
        <div className="w-80">
          <Card className="bg-slate-800 border-slate-600 h-full">
            <CardHeader>
              <CardTitle className="text-white text-lg">Move History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {moveHistory.length === 0 ? (
                <p className="text-slate-400 text-sm">No moves yet</p>
              ) : (
                moveHistory.map((move, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center p-2 bg-slate-700 rounded text-sm"
                  >
                    <span className="text-slate-300">
                      {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}
                    </span>
                    <span className="text-white font-mono">
                      {move.san}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}