'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useStockfish(difficulty = 'medium') {
  const [engine, setEngine] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const engineRef = useRef(null)

  const difficultySettings = {
    easy: { depth: 5, skillLevel: 5 },
    medium: { depth: 10, skillLevel: 10 },
    hard: { depth: 15, skillLevel: 15 },
    master: { depth: 20, skillLevel: 20 }
  }

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return

    let stockfish = null
    
    const initEngine = async () => {
      try {
        // Import stockfish dynamically
        const Stockfish = await import('stockfish')
        stockfish = Stockfish.default ? Stockfish.default() : Stockfish()
        
        engineRef.current = stockfish

        // Set up message listener
        stockfish.onmessage = (message) => {
          console.log('Stockfish:', message)
          if (message.includes('uciok')) {
            setIsReady(true)
          }
        }

        // Initialize UCI
        stockfish.postMessage('uci')
        
        // Apply difficulty settings
        const settings = difficultySettings[difficulty]
        stockfish.postMessage(`setoption name Skill Level value ${settings.skillLevel}`)
        
        setEngine(stockfish)
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error)
      }
    }

    initEngine()

    // Cleanup
    return () => {
      if (engineRef.current) {
        engineRef.current.postMessage('quit')
        engineRef.current = null
      }
    }
  }, [difficulty])

  const getBestMove = useCallback(
    (fen, callback) => {
      if (!engine || !isReady) {
        console.error('Engine not ready')
        return
      }

      setIsThinking(true)
      const settings = difficultySettings[difficulty]
      
      let bestMove = null

      const messageHandler = (message) => {
        if (message.includes('bestmove')) {
          const match = message.match(/bestmove\s+(\S+)/)
          if (match) {
            bestMove = match[1]
            setIsThinking(false)
            engine.onmessage = null
            callback(bestMove)
          }
        }
      }

      engine.onmessage = messageHandler

      // Send position and search command
      engine.postMessage(`position fen ${fen}`)
      engine.postMessage(`go depth ${settings.depth}`)
    },
    [engine, isReady, difficulty]
  )

  return {
    isReady,
    isThinking,
    getBestMove,
  }
}
