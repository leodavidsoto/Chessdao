const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { Chess } = require('chess.js')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT, 10) || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Game Engine class (simplified version for server)
class GameEngine {
  constructor(gameId, players, betAmount = 0, timeControl = '10+0') {
    this.gameId = gameId
    this.chess = new Chess()
    this.players = players
    this.betAmount = betAmount
    this.timeControl = timeControl
    this.gameState = 'active'
    this.winner = null
    this.moves = []
    this.currentTurn = 'white'
    this.spectators = []
    this.createdAt = new Date()
    this.title = ''
    
    // Parse time control
    const [minutes, increment] = timeControl.split('+').map(Number)
    this.timeLeft = {
      initial: minutes * 60,
      increment: increment || 0
    }
    
    this.clocks = {
      white: this.timeLeft.initial * 1000,
      black: this.timeLeft.initial * 1000
    }
    this.lastMoveTime = Date.now()
  }
  
  makeMove(move, playerId) {
    try {
      if (!this.isPlayerTurn(playerId)) {
        return { success: false, error: 'Not your turn' }
      }
      
      if (this.gameState !== 'active') {
        return { success: false, error: 'Game is not active' }
      }
      
      const moveResult = this.chess.move(move)
      if (!moveResult) {
        return { success: false, error: 'Invalid move' }
      }
      
      const now = Date.now()
      const timeTaken = now - this.lastMoveTime
      const currentColor = this.currentTurn
      
      this.clocks[currentColor] -= timeTaken
      this.clocks[currentColor] += this.timeLeft.increment * 1000
      
      if (this.clocks[currentColor] <= 0) {
        this.gameState = 'finished'
        this.winner = currentColor === 'white' ? 'black' : 'white'
        return {
          success: true,
          move: moveResult,
          gameState: 'timeout',
          winner: this.winner,
          fen: this.chess.fen()
        }
      }
      
      this.moves.push({
        ...moveResult,
        playerId,
        timestamp: now,
        timeLeft: this.clocks[currentColor]
      })
      
      this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black'
      this.lastMoveTime = now
      
      if (this.chess.isGameOver()) {
        this.gameState = 'finished'
        if (this.chess.isCheckmate()) {
          this.winner = currentColor
        } else {
          this.winner = 'draw'
        }
      }
      
      return {
        success: true,
        move: moveResult,
        gameState: this.gameState,
        winner: this.winner,
        fen: this.chess.fen(),
        currentTurn: this.currentTurn,
        clocks: this.clocks
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  isPlayerTurn(playerId) {
    const currentColorPlayer = this.players[this.currentTurn]
    return currentColorPlayer && currentColorPlayer.id === playerId
  }
  
  getGameState() {
    return {
      gameId: this.gameId,
      fen: this.chess.fen(),
      moves: this.moves,
      gameState: this.gameState,
      winner: this.winner,
      currentTurn: this.currentTurn,
      players: this.players,
      betAmount: this.betAmount,
      timeControl: this.timeControl,
      clocks: this.clocks,
      spectators: this.spectators.length,
      title: this.title,
      createdAt: this.createdAt
    }
  }
  
  addSpectator(userId) {
    if (!this.spectators.includes(userId)) {
      this.spectators.push(userId)
    }
  }
  
  resign(playerId) {
    if (this.gameState !== 'active') {
      return { success: false, error: 'Game is not active' }
    }
    
    const playerColor = Object.keys(this.players).find(
      color => this.players[color]?.id === playerId
    )
    
    if (!playerColor) {
      return { success: false, error: 'Player not in game' }
    }
    
    this.gameState = 'finished'
    this.winner = playerColor === 'white' ? 'black' : 'white'
    
    return {
      success: true,
      gameState: 'resigned',
      winner: this.winner,
      resignedPlayer: playerColor
    }
  }
}

// Game Manager
class GameManager {
  constructor() {
    this.games = new Map()
    this.playerGames = new Map()
  }
  
  createGame(gameId, players, betAmount, timeControl) {
    const game = new GameEngine(gameId, players, betAmount, timeControl)
    this.games.set(gameId, game)
    
    Object.values(players).forEach(player => {
      if (player?.id) {
        this.playerGames.set(player.id, gameId)
      }
    })
    
    return game
  }
  
  getGame(gameId) {
    return this.games.get(gameId)
  }
  
  getPlayerGame(playerId) {
    const gameId = this.playerGames.get(playerId)
    return gameId ? this.games.get(gameId) : null
  }
  
  endGame(gameId) {
    const game = this.games.get(gameId)
    if (game) {
      Object.values(game.players).forEach(player => {
        if (player?.id) {
          this.playerGames.delete(player.id)
        }
      })
      this.games.delete(gameId)
    }
  }
  
  getActiveGames() {
    return Array.from(this.games.values())
      .filter(game => game.gameState === 'active')
      .map(game => game.getGameState())
  }
  
  getWaitingGames() {
    return Array.from(this.games.values())
      .filter(game => game.gameState === 'waiting')
      .map(game => game.getGameState())
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })
  
  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST']
    }
  })
  
  // Game state
  const gameManager = new GameManager()
  const connectedUsers = new Map()
  
  console.log('🎮 ChessDAO WebSocket Server initializing...')
  
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`)
    
    // Authentication
    socket.on('authenticate', (userData) => {
      connectedUsers.set(socket.id, {
        ...userData,
        socketId: socket.id,
        isOnline: true
      })
      
      socket.emit('authenticated', { success: true, socketId: socket.id })
      
      io.emit('users_update', {
        onlineUsers: Array.from(connectedUsers.values())
      })
      
      // Send available games
      socket.emit('games_list', {
        waiting: gameManager.getWaitingGames(),
        active: gameManager.getActiveGames()
      })
    })
    
    // Create PVP game
    socket.on('create_pvp_game', (data) => {
      try {
        const { creatorId, betAmount, timeControl, title } = data
        const gameId = `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const players = {
          white: { id: creatorId, socketId: socket.id },
          black: null
        }
        
        const game = gameManager.createGame(gameId, players, betAmount, timeControl)
        game.gameState = 'waiting'
        game.title = title || `Game by ${creatorId.slice(0, 8)}...`
        
        socket.join(gameId)
        
        socket.emit('game_created', {
          success: true,
          gameId,
          gameState: game.getGameState()
        })
        
        io.emit('new_game_available', {
          gameId,
          gameState: game.getGameState()
        })
        
        console.log(`🎲 Game created: ${gameId}`)
      } catch (error) {
        socket.emit('error', { message: 'Failed to create game', error: error.message })
      }
    })
    
    // Join PVP game
    socket.on('join_pvp_game', (data) => {
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
        
        game.players.black = { id: playerId, socketId: socket.id }
        game.gameState = 'active'
        
        socket.join(gameId)
        
        io.to(gameId).emit('game_started', {
          gameId,
          gameState: game.getGameState()
        })
        
        io.emit('game_no_longer_available', { gameId })
        
        console.log(`🎮 Game started: ${gameId}`)
      } catch (error) {
        socket.emit('error', { message: 'Failed to join game', error: error.message })
      }
    })
    
    // Make move
    socket.on('make_move', (data) => {
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
        
        io.to(gameId).emit('move_made', {
          gameId,
          move: result.move,
          gameState: game.getGameState()
        })
        
        if (game.gameState === 'finished') {
          io.to(gameId).emit('game_ended', {
            gameId,
            reason: result.winner === 'draw' ? 'draw' : 'checkmate',
            winner: result.winner,
            gameState: game.getGameState()
          })
          
          setTimeout(() => gameManager.endGame(gameId), 300000)
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to make move', error: error.message })
      }
    })
    
    // Resign
    socket.on('resign_game', (data) => {
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
          
          setTimeout(() => gameManager.endGame(gameId), 300000)
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to resign', error: error.message })
      }
    })
    
    // Chat
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
        io.to(gameId).emit('new_message', messageData)
      } else {
        io.emit('new_message', messageData)
      }
    })
    
    // Spectate
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
    
    // Get waiting games
    socket.on('get_waiting_games', () => {
      socket.emit('games_list', {
        waiting: gameManager.getWaitingGames()
      })
    })
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`)
      
      const user = connectedUsers.get(socket.id)
      connectedUsers.delete(socket.id)
      
      io.emit('users_update', {
        onlineUsers: Array.from(connectedUsers.values())
      })
      
      // Handle game abandonment
      if (user?.id) {
        const game = gameManager.getPlayerGame(user.id)
        if (game && game.gameState === 'active') {
          setTimeout(() => {
            const stillDisconnected = !Array.from(connectedUsers.values())
              .some(u => u.id === user.id)
            
            if (stillDisconnected && game.gameState === 'active') {
              const result = game.resign(user.id)
              if (result.success) {
                io.to(game.gameId).emit('game_ended', {
                  gameId: game.gameId,
                  reason: 'abandonment',
                  winner: result.winner,
                  gameState: game.getGameState()
                })
              }
            }
          }, 30000)
        }
      }
    })
  })
  
  server.listen(port, hostname, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏰 ChessDAO Server Running                              ║
║                                                          ║
║   📍 URL: http://${hostname}:${port}                         ║
║   🔌 WebSocket: Enabled                                  ║
║   🌐 Environment: ${dev ? 'Development' : 'Production'}                        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `)
  })
})
