'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook para usar Stockfish WASM - Motor de ajedrez en el navegador
 * Usa la versión WebAssembly de Lichess (no requiere servidor)
 */
export function useStockfish(difficulty = 'medium') {
  const [engine, setEngine] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const engineRef = useRef(null)

  const difficultySettings = {
    easy: { depth: 5, skillLevel: 3, moveTime: 500 },
    medium: { depth: 10, skillLevel: 10, moveTime: 1000 },
    hard: { depth: 15, skillLevel: 15, moveTime: 2000 },
    master: { depth: 20, skillLevel: 20, moveTime: 3000 }
  }

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return

    let stockfish = null
    let mounted = true

    const initEngine = async () => {
      try {
        // Use Lichess Stockfish WASM - works in all browsers
        const wasmSupported = typeof WebAssembly !== 'undefined'

        if (wasmSupported) {
          // Create Web Worker with inline Stockfish loader
          const workerCode = `
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
          `
          const blob = new Blob([workerCode], { type: 'application/javascript' })
          stockfish = new Worker(URL.createObjectURL(blob))
        } else {
          console.warn('WebAssembly not supported, using fallback')
          // Fallback to simpler engine via CDN
          stockfish = new Worker('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        }

        if (!mounted) return

        engineRef.current = stockfish

        // Set up message listener
        stockfish.onmessage = (event) => {
          const message = typeof event.data === 'string' ? event.data : event.data?.toString()

          if (!message) return

          // Engine ready
          if (message.includes('uciok')) {
            console.log('♟️ Stockfish WASM ready!')
            setIsReady(true)

            // Set difficulty
            const settings = difficultySettings[difficulty]
            stockfish.postMessage(`setoption name Skill Level value ${settings.skillLevel}`)
            stockfish.postMessage('isready')
          }

          // Evaluation info
          if (message.includes('info depth') && message.includes('score')) {
            const scoreMatch = message.match(/score (cp|mate) (-?\d+)/)
            if (scoreMatch) {
              const type = scoreMatch[1]
              const value = parseInt(scoreMatch[2])
              setEvaluation({
                type,
                value: type === 'cp' ? value / 100 : value
              })
            }
          }
        }

        // Initialize UCI protocol
        stockfish.postMessage('uci')

        setEngine(stockfish)
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error)
      }
    }

    initEngine()

    // Cleanup
    return () => {
      mounted = false
      if (engineRef.current) {
        engineRef.current.postMessage('quit')
        engineRef.current.terminate()
        engineRef.current = null
      }
    }
  }, [difficulty])

  // Get best move for position
  const getBestMove = useCallback(
    (fen, callback) => {
      if (!engine || !isReady) {
        console.error('♟️ Engine not ready yet')
        return
      }

      setIsThinking(true)
      const settings = difficultySettings[difficulty]

      const messageHandler = (event) => {
        const message = typeof event.data === 'string' ? event.data : event.data?.toString()

        if (message && message.includes('bestmove')) {
          const match = message.match(/bestmove\s+(\S+)/)
          if (match) {
            const bestMove = match[1]
            console.log(`♟️ Best move: ${bestMove}`)
            setIsThinking(false)
            engine.onmessage = null
            callback(bestMove)
          }
        }
      }

      engine.onmessage = messageHandler

      // Send position and search command
      engine.postMessage(`position fen ${fen}`)
      engine.postMessage(`go depth ${settings.depth} movetime ${settings.moveTime}`)
    },
    [engine, isReady, difficulty]
  )

  // Stop current calculation
  const stop = useCallback(() => {
    if (engine) {
      engine.postMessage('stop')
      setIsThinking(false)
    }
  }, [engine])

  // Analyze position without making a move
  const analyze = useCallback(
    (fen, depth = 15) => {
      if (!engine || !isReady) return

      engine.postMessage(`position fen ${fen}`)
      engine.postMessage(`go depth ${depth}`)
    },
    [engine, isReady]
  )

  return {
    isReady,
    isThinking,
    evaluation,
    getBestMove,
    stop,
    analyze,
  }
}
