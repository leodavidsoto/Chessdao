'use client'

import { Chess } from 'chess.js'

export class GameEngine {
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
    this.timeLeft = this.parseTimeControl(timeControl)
    this.lastMoveTime = Date.now()
    this.spectators = []
    
    // Initialize player clocks
    this.clocks = {
      white: this.timeLeft.initial * 1000, // Convert to milliseconds
      black: this.timeLeft.initial * 1000
    }
  }
  
  parseTimeControl(timeControl) {
    const [minutes, increment] = timeControl.split('+').map(Number)
    return {
      initial: minutes * 60, // Convert to seconds
      increment: increment || 0
    }
  }
  
  makeMove(move, playerId) {
    try {
      // Validate player turn
      if (!this.isPlayerTurn(playerId)) {
        return { success: false, error: 'Not your turn' }
      }
      
      // Validate game state
      if (this.gameState !== 'active') {
        return { success: false, error: 'Game is not active' }
      }
      
      // Make the move
      const moveResult = this.chess.move(move)
      if (!moveResult) {
        return { success: false, error: 'Invalid move' }
      }
      
      // Update game state
      const now = Date.now()
      const timeTaken = now - this.lastMoveTime
      
      // Update player clock
      const currentColor = this.currentTurn
      this.clocks[currentColor] -= timeTaken
      this.clocks[currentColor] += this.timeLeft.increment * 1000 // Add increment
      
      // Check for time out
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
      
      // Store move
      const moveRecord = {
        ...moveResult,
        playerId,
        timestamp: now,
        timeLeft: this.clocks[currentColor]
      }
      this.moves.push(moveRecord)
      
      // Switch turns
      this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black'
      this.lastMoveTime = now
      
      // Check for game end
      if (this.chess.isGameOver()) {
        this.gameState = 'finished'
        if (this.chess.isCheckmate()) {
          this.winner = currentColor // Last player to move wins
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
      spectators: this.spectators.length
    }
  }
  
  addSpectator(userId) {
    if (!this.spectators.includes(userId)) {
      this.spectators.push(userId)
    }
  }
  
  removeSpectator(userId) {
    this.spectators = this.spectators.filter(id => id !== userId)
  }
  
  resign(playerId) {
    if (this.gameState !== 'active') {
      return { success: false, error: 'Game is not active' }
    }
    
    // Find which color the player is
    const playerColor = Object.keys(this.players).find(
      color => this.players[color].id === playerId
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
  
  drawOffer(playerId) {
    // In a full implementation, this would handle draw offers
    // For now, just accept draws
    this.gameState = 'finished'
    this.winner = 'draw'
    
    return {
      success: true,
      gameState: 'draw',
      winner: 'draw'
    }
  }
  
  getValidMoves() {
    return this.chess.moves({ verbose: true })
  }
  
  isInCheck() {
    return this.chess.isCheck()
  }
  
  isCheckmate() {
    return this.chess.isCheckmate()
  }
  
  isStalemate() {
    return this.chess.isStalemate()
  }
  
  isDraw() {
    return this.chess.isDraw()
  }
}

// Game manager for handling multiple games
export class GameManager {
  constructor() {
    this.games = new Map()
    this.playerGames = new Map() // Map player ID to game ID
  }
  
  createGame(gameId, players, betAmount, timeControl) {
    const game = new GameEngine(gameId, players, betAmount, timeControl)
    this.games.set(gameId, game)
    
    // Map players to game
    Object.values(players).forEach(player => {
      if (player.id) {
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
      // Remove player mappings
      Object.values(game.players).forEach(player => {
        if (player.id) {
          this.playerGames.delete(player.id)
        }
      })
      
      this.games.delete(gameId)
    }
  }
  
  getAllGames() {
    return Array.from(this.games.values()).map(game => game.getGameState())
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