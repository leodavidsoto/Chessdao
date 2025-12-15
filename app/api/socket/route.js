import { NextRequest, NextResponse } from 'next/server'
// Note: socket.io Server is initialized in a custom server, not in API routes
// import { Server } from 'socket.io'
import { GameManager } from '@/lib/gameEngine'
import { transferChessTokens } from '@/lib/solana'

// Global game manager
let gameManager = null
try {
  gameManager = new GameManager()
} catch (e) {
  console.log('GameManager initialization deferred')
}

export async function GET(request) {
  return NextResponse.json({
    message: "WebSocket server info",
    connectedPlayers: 0,
    activeGames: gameManager?.getActiveGames?.()?.length || 0
  })
}

// Socket.io server setup for real-time multiplayer
let io = null

export function initSocketServer(server) {
  if (io) return io

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  const connectedUsers = new Map()

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Handle user authentication
    socket.on('authenticate', (userData) => {
      connectedUsers.set(socket.id, {
        ...userData,
        socketId: socket.id,
        isOnline: true
      })

      socket.emit('authenticated', { success: true, socketId: socket.id })

      // Broadcast updated online users
      io.emit('users_update', {
        onlineUsers: Array.from(connectedUsers.values())
      })
    })

    // Handle creating PVP game
    socket.on('create_pvp_game', async (data) => {
      try {
        const { creatorId, betAmount, timeControl, title } = data
        const gameId = `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Create game with creator as white
        const players = {
          white: { id: creatorId, socketId: socket.id },
          black: null // Waiting for opponent
        }

        const game = gameManager.createGame(gameId, players, betAmount, timeControl)
        game.gameState = 'waiting'
        game.title = title
        game.createdAt = new Date()

        // Join creator to game room
        socket.join(gameId)

        socket.emit('game_created', {
          success: true,
          gameId,
          gameState: game.getGameState()
        })

        // Broadcast new game to lobby
        io.emit('new_game_available', {
          gameId,
          gameState: game.getGameState()
        })

      } catch (error) {
        socket.emit('error', { message: 'Failed to create game', error: error.message })
      }
    })

    // Handle joining PVP game
    socket.on('join_pvp_game', async (data) => {
      try {
        const { gameId, playerId } = data
        const game = gameManager.getGame(gameId)

        if (!game) {
          socket.emit('error', { message: 'Game not found' })
          return
        }

        if (game.gameState !== 'waiting') {
          socket.emit('error', { message: 'Game is not available' })
          return
        }

        // Add player as black
        game.players.black = { id: playerId, socketId: socket.id }
        game.gameState = 'active'

        // Join player to game room
        socket.join(gameId)

        // Notify both players
        io.to(gameId).emit('game_started', {
          gameId,
          gameState: game.getGameState()
        })

        // Remove from available games
        io.emit('game_no_longer_available', { gameId })

      } catch (error) {
        socket.emit('error', { message: 'Failed to join game', error: error.message })
      }
    })

    // Handle chess moves
    socket.on('make_move', async (data) => {
      try {
        const { gameId, move, playerId } = data
        const game = gameManager.getGame(gameId)

        if (!game) {
          socket.emit('error', { message: 'Game not found' })
          return
        }

        const result = game.makeMove(move, playerId)

        if (!result.success) {
          socket.emit('move_error', { error: result.error })
          return
        }

        // Broadcast move to all players in the game
        io.to(gameId).emit('move_made', {
          gameId,
          move: result.move,
          gameState: game.getGameState()
        })

        // Handle game end
        if (game.gameState === 'finished') {
          await handleGameEnd(gameId, game)
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to make move', error: error.message })
      }
    })

    // Handle resignation
    socket.on('resign_game', async (data) => {
      try {
        const { gameId, playerId } = data
        const game = gameManager.getGame(gameId)

        if (!game) {
          socket.emit('error', { message: 'Game not found' })
          return
        }

        const result = game.resign(playerId)

        if (result.success) {
          io.to(gameId).emit('game_ended', {
            gameId,
            reason: 'resignation',
            winner: result.winner,
            gameState: game.getGameState()
          })

          await handleGameEnd(gameId, game)
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to resign', error: error.message })
      }
    })

    // Handle chat messages
    socket.on('send_message', (data) => {
      const { gameId, message, playerId, username } = data
      const user = connectedUsers.get(socket.id)

      const messageData = {
        id: Date.now(),
        gameId,
        user: username || user?.username || 'Anonymous',
        message,
        timestamp: new Date(),
        type: 'chat'
      }

      if (gameId) {
        // Game-specific chat
        io.to(gameId).emit('new_message', messageData)
      } else {
        // Lobby chat
        io.emit('new_message', messageData)
      }
    })

    // Handle spectating
    socket.on('spectate_game', (data) => {
      const { gameId, userId } = data
      const game = gameManager.getGame(gameId)

      if (game) {
        socket.join(gameId)
        game.addSpectator(userId)

        socket.emit('spectating', {
          gameId,
          gameState: game.getGameState()
        })
      }
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)

      // Remove from connected users
      const user = connectedUsers.get(socket.id)
      connectedUsers.delete(socket.id)

      // Update online users
      io.emit('users_update', {
        onlineUsers: Array.from(connectedUsers.values())
      })

      // Handle game abandonment
      if (user) {
        const game = gameManager.getPlayerGame(user.id)
        if (game && game.gameState === 'active') {
          // Auto-resign after 30 seconds of disconnect
          setTimeout(() => {
            const stillDisconnected = !connectedUsers.has(socket.id)
            if (stillDisconnected && game.gameState === 'active') {
              const result = game.resign(user.id)
              if (result.success) {
                io.to(game.gameId).emit('game_ended', {
                  gameId: game.gameId,
                  reason: 'abandonment',
                  winner: result.winner,
                  gameState: game.getGameState()
                })
                handleGameEnd(game.gameId, game)
              }
            }
          }, 30000) // 30 seconds
        }
      }
    })
  })

  // Handle game end and token transfers
  async function handleGameEnd(gameId, game) {
    try {
      if (game.betAmount > 0 && game.winner !== 'draw') {
        const winner = game.players[game.winner]
        const loser = game.players[game.winner === 'white' ? 'black' : 'white']

        if (winner && loser) {
          // Transfer tokens from loser to winner
          const transferResult = await transferChessTokens(
            loser.walletAddress,
            winner.walletAddress,
            game.betAmount
          )

          io.to(gameId).emit('token_transfer', {
            success: transferResult.success,
            winner: winner.id,
            loser: loser.id,
            amount: game.betAmount,
            signature: transferResult.signature
          })
        }
      }

      // Clean up game after 5 minutes
      setTimeout(() => {
        gameManager.endGame(gameId)
      }, 300000) // 5 minutes

    } catch (error) {
      console.error('Error handling game end:', error)
    }
  }

  return io
}

// Export for Next.js custom server
export { gameManager }