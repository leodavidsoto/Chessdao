'use client'

import { useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Users, Swords, Clock, RotateCcw, Flag, Handshake, Trophy, AlertTriangle } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@solana/wallet-adapter-react'
import { useChessTokens } from '@/hooks/useChessTokens'

export default function ChessBoardPane({ gameMode, gameData }) {
  const { publicKey } = useWallet()
  const { gameState, actions: socketActions } = useSocket()
  const { actions: { formatChessAmount } } = useChessTokens()
  
  const [localGame, setLocalGame] = useState(new Chess())
  const [boardPosition, setBoardPosition] = useState('start')
  const [moveHistory, setMoveHistory] = useState([])
  const [boardOrientation, setBoardOrientation] = useState('white')
  const [selectedSquares, setSelectedSquares] = useState({})
  const [gameStatus, setGameStatus] = useState('active')
  const [winner, setWinner] = useState(null)
  const [timeLeft, setTimeLeft] = useState({ white: 600, black: 600 }) // 10 minutes in seconds
  const [currentTurn, setCurrentTurn] = useState('white')
  const [isMyTurn, setIsMyTurn] = useState(false)

  // Update local game state when socket game state changes
  useEffect(() => {
    if (gameState && gameState.fen) {
      const newGame = new Chess(gameState.fen)
      setLocalGame(newGame)
      setBoardPosition(gameState.fen)
      setMoveHistory(gameState.moves || [])
      setGameStatus(gameState.gameState || 'active')
      setWinner(gameState.winner)
      setCurrentTurn(gameState.currentTurn || 'white')
      
      // Update clocks if available
      if (gameState.clocks) {
        setTimeLeft({
          white: Math.max(0, Math.floor(gameState.clocks.white / 1000)),
          black: Math.max(0, Math.floor(gameState.clocks.black / 1000))
        })
      }
      
      // Determine if it's user's turn in PVP
      if (gameMode === 'pvp' && gameState.players && publicKey) {
        const userId = publicKey.toString()
        const userColor = Object.keys(gameState.players).find(
          color => gameState.players[color]?.id === userId
        )
        setIsMyTurn(userColor === gameState.currentTurn)
        
        // Auto-flip board for black player
        if (userColor === 'black' && boardOrientation === 'white') {
          setBoardOrientation('black')
        }
      }
    }
  }, [gameState, gameMode, publicKey, boardOrientation])

  // Timer countdown effect
  useEffect(() => {
    if (gameStatus !== 'active' || !gameState?.gameId) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = { ...prev }
        if (currentTurn === 'white' && newTime.white > 0) {
          newTime.white -= 1
        } else if (currentTurn === 'black' && newTime.black > 0) {
          newTime.black -= 1
        }
        
        // Check for timeout
        if (newTime.white <= 0 || newTime.black <= 0) {
          setGameStatus('timeout')
          setWinner(newTime.white <= 0 ? 'black' : 'white')
        }
        
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, currentTurn, gameState])

  const onPieceDrop = useCallback((sourceSquare, targetSquare) => {
    // Only allow moves in PVP if it's the player's turn
    if (gameMode === 'pvp' && gameState?.gameId) {
      if (!isMyTurn) {
        console.log('Not your turn!')
        return false // Not player's turn
      }
      
      // Try the move locally first to validate
      const tempGame = new Chess(localGame.fen())
      try {
        const move = tempGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        })
        
        if (move) {
          // Move is valid, send via socket
          const moveData = {
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q'
          }
          
          socketActions.makeMove(gameState.gameId, moveData)
          return true // Allow the move visually
        }
      } catch (error) {
        console.log('Invalid PVP move:', error)
        return false
      }
      return false
    }
    
    // Local/practice game - ALWAYS allow moves here
    try {
      const move = localGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      })

      if (move) {
        const newGame = new Chess(localGame.fen())
        setLocalGame(newGame)
        setBoardPosition(newGame.fen())
        setMoveHistory(prev => [...prev, move])
        setCurrentTurn(newGame.turn() === 'w' ? 'white' : 'black')

        // Check for game end
        if (newGame.isGameOver()) {
          if (newGame.isCheckmate()) {
            setGameStatus('checkmate')
            setWinner(move.color === 'w' ? 'white' : 'black')
          } else {
            setGameStatus('draw')
            setWinner('draw')
          }
        }
        
        console.log('Move made successfully:', move.san)
        return true
      }
    } catch (error) {
      console.log('Invalid move:', error)
      return false
    }
    return false
  }, [gameMode, gameState, isMyTurn, localGame, socketActions])

  const resetGame = () => {
    if (gameMode === 'pvp' && gameState?.gameId) {
      // Can't reset PVP games
      return
    }
    
    const newGame = new Chess()
    setLocalGame(newGame)
    setBoardPosition(newGame.fen())
    setMoveHistory([])
    setGameStatus('active')
    setWinner(null)
    setCurrentTurn('white')
    setTimeLeft({ white: 600, black: 600 })
  }

  const flipBoard = () => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
  }

  const handleResign = () => {
    if (gameMode === 'pvp' && gameState?.gameId) {
      socketActions.resignGame(gameState.gameId)
    } else {
      // Local resignation
      setGameStatus('resigned')
      setWinner(currentTurn === 'white' ? 'black' : 'white')
    }
  }

  const handleDrawOffer = () => {
    if (gameMode === 'pvp' && gameState?.gameId) {
      // In a full implementation, this would send a draw offer
      // For now, just accept draws
      setGameStatus('draw')
      setWinner('draw')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getModeInfo = () => {
    switch (gameMode) {
      case 'community':
        return {
          icon: <Crown className="h-5 w-5 text-yellow-400" />,
          title: 'Community DAO Game',
          description: 'Democratic chess with token voting',
          badge: 'DAO Mode',
          badgeColor: 'bg-yellow-500'
        }
      case 'pvp':
        return {
          icon: <Swords className="h-5 w-5 text-red-400" />,
          title: 'PVP Battle Arena',
          description: gameState ? `${formatChessAmount(gameState.betAmount)} CHESS at stake` : 'Player vs Player',
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

  const getStatusMessage = () => {
    if (gameStatus === 'waiting') return 'Waiting for opponent...'
    if (gameStatus === 'checkmate') return `Checkmate! ${winner} wins`
    if (gameStatus === 'timeout') return `Time out! ${winner} wins`
    if (gameStatus === 'resigned') return `${winner} wins by resignation`
    if (gameStatus === 'draw') return 'Game drawn'
    if (gameMode === 'pvp' && gameState) {
      return isMyTurn ? "Your turn" : "Opponent's turn"
    }
    return `${currentTurn === 'white' ? 'White' : 'Black'} to move`
  }

  const canMakeMove = gameMode !== 'pvp' || isMyTurn

  return (
    <div className="max-w-5xl w-full">
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
            <div className="flex items-center space-x-4">
              <Badge className={`${modeInfo.badgeColor} text-white`}>
                {modeInfo.badge}
              </Badge>
              <div className="text-slate-300 text-sm">
                {getStatusMessage()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex gap-6">
        {/* Chess Board */}
        <div className="flex-1">
          <Card className="bg-slate-800 border-slate-600 p-4">
            {/* Player Info - Top */}
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-700 rounded">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white">
                  {boardOrientation === 'white' ? '👤' : '🎮'}
                </div>
                <div>
                  <div className="text-white font-semibold">
                    {gameState?.players ? 
                      (boardOrientation === 'white' ? 
                        gameState.players.black?.username || 'Opponent' : 
                        gameState.players.white?.username || 'Opponent'
                      ) : 
                      (boardOrientation === 'white' ? 'Black' : 'White')
                    }
                  </div>
                  <div className="text-slate-400 text-sm">Rating: 1650</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className={`text-lg font-mono ${
                  (boardOrientation === 'white' ? currentTurn === 'black' : currentTurn === 'white') && gameStatus === 'active'
                    ? 'text-yellow-400 font-bold' : 'text-white'
                }`}>
                  {formatTime(boardOrientation === 'white' ? timeLeft.black : timeLeft.white)}
                </span>
              </div>
            </div>

            {/* Chess Board */}
            <div className="aspect-square relative">
              <Chessboard
                position={boardPosition}
                onPieceDrop={canMakeMove ? onPieceDrop : () => false}
                boardOrientation={boardOrientation}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#4B5563' }}
                customLightSquareStyle={{ backgroundColor: '#D1D5DB' }}
                customSquareStyles={selectedSquares}
                arePiecesDraggable={canMakeMove && gameStatus === 'active'}
              />
              
              {/* Game Status Overlay */}
              {gameStatus !== 'active' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                  <Card className="bg-slate-800 border-slate-600 p-6 text-center">
                    <div className="mb-4">
                      {winner === 'draw' ? (
                        <Handshake className="h-16 w-16 text-gray-400 mx-auto" />
                      ) : gameStatus === 'timeout' ? (
                        <AlertTriangle className="h-16 w-16 text-orange-400 mx-auto" />
                      ) : (
                        <Trophy className="h-16 w-16 text-yellow-400 mx-auto" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {getStatusMessage()}
                    </h3>
                    {gameState?.betAmount > 0 && winner !== 'draw' && (
                      <p className="text-slate-300">
                        {formatChessAmount(gameState.betAmount)} CHESS tokens transferred!
                      </p>
                    )}
                  </Card>
                </div>
              )}
            </div>

            {/* Player Info - Bottom */}
            <div className="flex items-center justify-between mt-4 p-3 bg-slate-700 rounded">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                  🎮
                </div>
                <div>
                  <div className="text-white font-semibold">
                    {gameState?.players ? 
                      (boardOrientation === 'white' ? 
                        gameState.players.white?.username || 'You' : 
                        gameState.players.black?.username || 'You'
                      ) : 
                      'You'
                    }
                  </div>
                  <div className="text-slate-400 text-sm">Rating: 1650</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className={`text-lg font-mono ${
                  (boardOrientation === 'white' ? currentTurn === 'white' : currentTurn === 'black') && gameStatus === 'active'
                    ? 'text-yellow-400 font-bold' : 'text-white'
                }`}>
                  {formatTime(boardOrientation === 'white' ? timeLeft.white : timeLeft.black)}
                </span>
              </div>
            </div>
            
            {/* Game Controls */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={flipBoard}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Flip
                </Button>
                
                {gameMode !== 'pvp' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetGame}
                    className="text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    New Game
                  </Button>
                )}
              </div>
              
              {gameStatus === 'active' && gameMode === 'pvp' && (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDrawOffer}
                    className="text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    <Handshake className="h-4 w-4 mr-1" />
                    Draw
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleResign}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    Resign
                  </Button>
                </div>
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
                    <span className="text-xs text-slate-500">
                      {move.timeLeft && formatTime(Math.floor(move.timeLeft / 1000))}
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