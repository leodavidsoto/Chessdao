'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Smile } from 'lucide-react'

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim()) {
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

  return (
    <Card className="bg-slate-800 border-slate-600 border-t-0 rounded-t-none">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            maxLength={500}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="text-slate-400 border-slate-600 hover:bg-slate-700 px-3"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button 
            type="submit" 
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-700 px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {message.length > 450 && (
          <div className="text-xs text-slate-400 mt-1">
            {500 - message.length} characters remaining
          </div>
        )}
      </CardContent>
    </Card>
  )
}