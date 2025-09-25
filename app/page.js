'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import LandingModal from '@/components/LandingModal'
import ChessBoardPane from '@/components/ChessBoardPane'
import WalletBar from '@/components/WalletBar'
import Lobby from '@/components/Lobby'
import CommunityGame from '@/components/CommunityGame'
import PvpArena from '@/components/PvpArena'
import ChatSidebar from '@/components/chat/ChatSidebar'
import { useSocket } from '@/hooks/useSocket'

export default function App() {
  const { connected } = useWallet()
  const { gameState } = useSocket()
  const [showLanding, setShowLanding] = useState(true)
  const [gameMode, setGameMode] = useState('lobby') // 'lobby', 'community', 'pvp'
  const [currentGame, setCurrentGame] = useState(null)

  useEffect(() => {
    if (connected) {
      setShowLanding(false)
    }
  }, [connected])

  // Update game mode when socket game state changes
  useEffect(() => {
    if (gameState && gameState.gameId) {
      setGameMode('pvp')
      setCurrentGame(gameState)
    }
  }, [gameState])

  const handleGameModeChange = (mode, gameData = null) => {
    setGameMode(mode)
    setCurrentGame(gameData)
  }

  if (showLanding && !connected) {
    return <LandingModal onClose={() => setShowLanding(false)} />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Bar */}
      <WalletBar />
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Game Modes */}
        <div className="w-80 border-r border-slate-700">
          {gameMode === 'lobby' && (
            <Lobby onGameSelect={handleGameModeChange} />
          )}
          {gameMode === 'community' && (
            <CommunityGame 
              gameData={currentGame}
              onBack={() => handleGameModeChange('lobby')}
            />
          )}
          {gameMode === 'pvp' && (
            <PvpArena 
              gameData={currentGame}
              onBack={() => handleGameModeChange('lobby')}
            />
          )}
        </div>

        {/* Center - Chess Board (Always Visible) */}
        <div className="flex-1 flex items-center justify-center p-8">
          <ChessBoardPane 
            gameMode={gameMode}
            gameData={currentGame}
          />
        </div>

        {/* Right Sidebar - Chat */}
        <div className="w-80 border-l border-slate-700">
          <ChatSidebar gameMode={gameMode} gameData={currentGame} />
        </div>
      </div>

      {/* Status Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-xs text-slate-400">
            DAO Chess v1.0 - Solana Devnet
          </div>
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <span>Current Mode: {gameMode.toUpperCase()}</span>
            {currentGame && (
              <span>Game: {currentGame.gameId || currentGame.id}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}