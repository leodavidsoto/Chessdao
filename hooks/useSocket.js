'use client'

import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useWallet } from '@solana/wallet-adapter-react'

export function useSocket() {
  const { publicKey } = useWallet()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [gameState, setGameState] = useState(null)
  
  useEffect(() => {
    // Initialize socket connection
    const newSocket = io({
      autoConnect: false
    })
    
    // Connection events
    newSocket.on('connect', () => {
      setConnected(true)
      console.log('Connected to server')
      
      // Authenticate user
      if (publicKey) {
        newSocket.emit('authenticate', {
          id: publicKey.toString(),
          walletAddress: publicKey.toString(),
          username: `Player_${publicKey.toString().slice(0, 8)}`
        })
      }
    })
    
    newSocket.on('disconnect', () => {
      setConnected(false)
      console.log('Disconnected from server')
    })
    
    // Authentication
    newSocket.on('authenticated', (data) => {
      console.log('User authenticated:', data)
    })
    
    // Users updates
    newSocket.on('users_update', (data) => {
      setOnlineUsers(data.onlineUsers || [])
    })
    
    // Chat messages
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
    })
    
    // Game events
    newSocket.on('game_created', (data) => {
      if (data.success) {
        setGameState(data.gameState)
      }
    })
    
    newSocket.on('game_started', (data) => {
      setGameState(data.gameState)
    })
    
    newSocket.on('move_made', (data) => {
      setGameState(data.gameState)
    })
    
    newSocket.on('game_ended', (data) => {
      setGameState(data.gameState)
    })
    
    newSocket.on('move_error', (data) => {
      console.error('Move error:', data.error)
    })
    
    newSocket.on('error', (data) => {
      console.error('Socket error:', data.message)
    })
    
    setSocket(newSocket)
    
    return () => {
      newSocket.close()
    }
  }, [])
  
  // Auto-connect when wallet is connected
  useEffect(() => {
    if (publicKey && socket && !connected) {
      socket.connect()
    }
  }, [publicKey, socket, connected])
  
  // Socket actions
  const createPvpGame = (betAmount, timeControl, title) => {
    if (socket && publicKey) {
      socket.emit('create_pvp_game', {
        creatorId: publicKey.toString(),
        betAmount,
        timeControl,
        title
      })
    }
  }
  
  const joinPvpGame = (gameId) => {
    if (socket && publicKey) {
      socket.emit('join_pvp_game', {
        gameId,
        playerId: publicKey.toString()
      })
    }
  }
  
  const makeMove = (gameId, move) => {
    if (socket && publicKey) {
      socket.emit('make_move', {
        gameId,
        move,
        playerId: publicKey.toString()
      })
    }
  }
  
  const resignGame = (gameId) => {
    if (socket && publicKey) {
      socket.emit('resign_game', {
        gameId,
        playerId: publicKey.toString()
      })
    }
  }
  
  const sendMessage = (message, gameId = null) => {
    if (socket && publicKey) {
      socket.emit('send_message', {
        gameId,
        message,
        playerId: publicKey.toString(),
        username: `Player_${publicKey.toString().slice(0, 8)}`
      })
    }
  }
  
  const spectateGame = (gameId) => {
    if (socket && publicKey) {
      socket.emit('spectate_game', {
        gameId,
        userId: publicKey.toString()
      })
    }
  }
  
  return {
    socket,
    connected,
    onlineUsers,
    messages,
    gameState,
    actions: {
      createPvpGame,
      joinPvpGame,
      makeMove,
      resignGame,
      sendMessage,
      spectateGame
    }
  }
}