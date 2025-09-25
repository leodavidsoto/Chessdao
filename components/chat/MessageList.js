'use client'

import { useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export default function MessageList({ messages }) {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getMessageTypeStyle = (type) => {
    switch (type) {
      case 'system':
        return 'bg-blue-600/20 border border-blue-600/30 text-blue-300'
      case 'game':
        return 'bg-green-600/20 border border-green-600/30 text-green-300'
      case 'error':
        return 'bg-red-600/20 border border-red-600/30 text-red-300'
      default:
        return ''
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-600 flex-1 border-b-0 rounded-b-none">
      <CardContent className="p-4 h-80 overflow-y-auto">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id || index} className={`flex items-start space-x-3 ${
                msg.type === 'system' || msg.type === 'game' || msg.type === 'error' ? 'justify-center' : ''
              }`}>
                {(msg.type === 'system' || msg.type === 'game' || msg.type === 'error') ? (
                  <div className={`rounded-lg px-3 py-1 ${getMessageTypeStyle(msg.type)}`}>
                    <span className="text-sm">{msg.message}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-lg flex-shrink-0">
                      {msg.avatar || '🎮'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white">
                          {msg.user}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1 break-words">
                        {msg.message}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div ref={messagesEndRef} />
      </CardContent>
    </Card>
  )
}