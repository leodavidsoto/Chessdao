'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users, Crown, Swords } from 'lucide-react'
import ChatWindow from './ChatWindow'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

export default function ChatSidebar({ gameMode, gameData }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'ChessNinja42',
      message: 'Great move with e4! Classic opening.',
      timestamp: new Date(Date.now() - 300000),
      type: 'chat',
      avatar: '🥷'
    },
    {
      id: 2,
      user: 'QueenSlayer',
      message: 'I think d4 is stronger in this position',
      timestamp: new Date(Date.now() - 240000),
      type: 'chat',
      avatar: '👑'
    },
    {
      id: 3,
      user: 'System',
      message: 'Voting phase ends in 2 minutes!',
      timestamp: new Date(Date.now() - 180000),
      type: 'system'
    },
    {
      id: 4,
      user: 'KnightRider',
      message: 'Anyone else thinking about the Spanish Opening?',
      timestamp: new Date(Date.now() - 120000),
      type: 'chat',
      avatar: '♞'
    }
  ])

  const [onlineUsers] = useState([
    { id: 1, name: 'ChessNinja42', status: 'online', avatar: '🥷' },
    { id: 2, name: 'QueenSlayer', status: 'online', avatar: '👑' },
    { id: 3, name: 'KnightRider', status: 'playing', avatar: '♞' },
    { id: 4, name: 'RookCastle', status: 'away', avatar: '🏰' },
    { id: 5, name: 'PawnStorm', status: 'online', avatar: '⚡' }
  ])

  const handleSendMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      user: 'You',
      message: message,
      timestamp: new Date(),
      type: 'chat',
      avatar: '🎮'
    }
    setMessages(prev => [...prev, newMessage])
  }

  const getChatTitle = () => {
    switch (gameMode) {
      case 'community':
        return 'Community Chat'
      case 'pvp':
        return 'Match Chat'
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

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <Card className="bg-slate-800 border-slate-600 border-b-0 rounded-b-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getChatIcon()}
              <CardTitle className="text-white text-lg">{getChatTitle()}</CardTitle>
            </div>
            <Badge variant="outline" className="text-slate-300">
              {onlineUsers.filter(u => u.status === 'online').length} online
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col">
        <MessageList messages={messages} />
        <MessageInput onSendMessage={handleSendMessage} />
      </div>

      {/* Online Users */}
      <Card className="bg-slate-800 border-slate-600 border-t-0 rounded-t-none">
        <CardHeader className="py-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Online Players</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 max-h-32 overflow-y-auto">
          <div className="space-y-2">
            {onlineUsers.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <span className="text-lg">{user.avatar}</span>
                <span className="text-sm text-slate-300 flex-1 truncate">
                  {user.name}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  user.status === 'online' ? 'bg-green-400' :
                  user.status === 'playing' ? 'bg-yellow-400' :
                  'bg-slate-500'
                }`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}