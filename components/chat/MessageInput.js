'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Smile } from 'lucide-react'

export default function MessageInput({ onSendMessage, disabled = false }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji)
  }

  const quickEmojis = ['😊', '😎', '🔥', '👍', '🎉', '😅', '🤔', '👏']

  return (
    <Card className="bg-slate-800 border-slate-600 border-t-0 rounded-t-none">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Quick Emoji Bar */}
          <div className="flex space-x-1 overflow-x-auto pb-1">
            {quickEmojis.map((emoji, index) => (
              <Button
                key={index}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addEmoji(emoji)}
                className="text-lg hover:bg-slate-700 px-2 py-1 min-w-fit"
                disabled={disabled}
              >
                {emoji}
              </Button>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "Connecting..." : "Type a message..."}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              maxLength={500}
              disabled={disabled}
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || disabled}
              className="bg-blue-600 hover:bg-blue-700 px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Character Counter */}
          {message.length > 400 && (
            <div className="text-xs text-slate-400 text-right">
              {500 - message.length} characters remaining
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}