'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users, Crown, Swords, Wifi, WifiOff } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

export default function ChatSidebar({ gameMode, gameData }) {
  const { connected, onlineUsers, messages, actions } = useSocket()
  const [filteredMessages, setFilteredMessages] = useState([])

  // Filter messages based on game context
  useEffect(() => {
    const gameId = gameData?.gameId || gameData?.id
    
    if (gameMode === 'pvp' && gameId) {
      // Show only messages for this specific game
      setFilteredMessages(messages.filter(msg => msg.gameId === gameId))
    } else {
      // Show lobby/general chat (messages without gameId)
      setFilteredMessages(messages.filter(msg => !msg.gameId))
    }
  }, [messages, gameMode, gameData])

  const handleSendMessage = (message) => {
    const gameId = (gameMode === 'pvp' && gameData?.gameId) ? gameData.gameId : null
    actions.sendMessage(message, gameId)
  }

  const getChatTitle = () => {
    switch (gameMode) {
      case 'community':
        return 'Community Chat'
      case 'pvp':
        return gameData ? `Game Chat` : 'PVP Lobby'
      default:
        return 'Lobby Chat'
    }
  }

  const getChatIcon = () => {
    switch (gameMode) {
      case 'community':
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 'pvp':
        return <Swords className="h-5 w-5 text-red-400" />
      default:
        return <MessageSquare className="h-5 w-5 text-blue-400" />
    }
  }

  const getChatDescription = () => {
    if (gameMode === 'pvp' && gameData) {
      return `Private game chat`
    }
    return `${onlineUsers.filter(u => u.isOnline).length} players online`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <Card className="bg-slate-800 border-slate-600 border-b-0 rounded-b-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getChatIcon()}
              <div>
                <CardTitle className="text-white text-lg">{getChatTitle()}</CardTitle>
                <p className="text-slate-400 text-sm">{getChatDescription()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {connected ? (
                <Wifi className="h-4 w-4 text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400" />
              )}
              {gameMode !== 'pvp' && (
                <Badge variant="outline" className="text-slate-300">
                  {onlineUsers.filter(u => u.isOnline).length} online
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Connection Status */}
      {!connected && (
        <Card className="bg-orange-900/20 border-orange-600 border-t-0 border-b-0 rounded-none">
          <CardContent className="p-3">
            <p className="text-orange-300 text-xs text-center">
              Reconnecting to chat server...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col">
        <MessageList messages={filteredMessages} />
        <MessageInput onSendMessage={handleSendMessage} disabled={!connected} />
      </div>

      {/* Online Users (only for lobby/community) */}
      {gameMode !== 'pvp' && (
        <Card className="bg-slate-800 border-slate-600 border-t-0 rounded-t-none">
          <CardHeader className="py-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Online Players</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 max-h-32 overflow-y-auto">
            <div className="space-y-2">
              {onlineUsers.slice(0, 8).map((user, index) => (
                <div key={user.socketId || index} className="flex items-center space-x-2">
                  <span className="text-lg">{user.avatar || '🎮'}</span>
                  <span className="text-sm text-slate-300 flex-1 truncate">
                    {user.username || `Player_${(user.id || '').slice(0, 8)}`}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    user.isOnline ? 'bg-green-400' : 'bg-slate-500'
                  }`} />
                </div>
              ))}
              
              {onlineUsers.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">
                  No players online
                </p>
              )}
              
              {onlineUsers.length > 8 && (
                <p className="text-slate-400 text-xs text-center pt-2">
                  +{onlineUsers.length - 8} more players
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PVP Game Status */}
      {gameMode === 'pvp' && gameData && (
        <Card className="bg-slate-800 border-slate-600 border-t-0 rounded-t-none">
          <CardHeader className="py-3">
            <div className="flex items-center space-x-2">
              <Swords className="h-4 w-4 text-red-400" />
              <span className="text-sm text-slate-400">Game Info</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status:</span>
                <span className="text-white capitalize">{gameData.gameState || 'Active'}</span>
              </div>
              {gameData.betAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Stakes:</span>
                  <span className="text-yellow-400">{gameData.betAmount} CHESS</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Time Control:</span>
                <span className="text-white">{gameData.timeControl || '10+0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}