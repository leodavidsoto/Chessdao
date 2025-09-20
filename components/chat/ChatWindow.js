'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ChatWindow({ messages, onSendMessage }) {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <Card className="bg-slate-800 border-slate-600 flex-1">
      <CardContent className="p-0 h-full">
        <ScrollArea className="h-full p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start space-x-3 ${
                msg.type === 'system' ? 'justify-center' : ''
              }`}>
                {msg.type === 'system' ? (
                  <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg px-3 py-1">
                    <span className="text-blue-300 text-sm">{msg.message}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-lg">{msg.avatar}</div>
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
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}