/**
 * GameToken ($GAME) Library
 * 
 * Token interno para juegos y apuestas dentro de ChessDAO.
 * Los $GAME tokens se almacenan en MongoDB, no en blockchain.
 * 
 * Conversión: 1 CHESS = 10 $GAME
 * Fee de swap: 1%
 */

// Configuración de tokens
export const TOKEN_CONFIG = {
    // Nombre del token interno
    GAME_TOKEN_NAME: 'GAME',
    GAME_TOKEN_SYMBOL: '$GAME',

    // Nombre del token real (SPL)
    CHESS_TOKEN_NAME: 'CHESS',
    CHESS_TOKEN_SYMBOL: 'CHESS',

    // Tasa de conversión: 1 CHESS = 10 $GAME
    CHESS_TO_GAME_RATE: 10,
    GAME_TO_CHESS_RATE: 0.1,

    // Comisión de swap (1%)
    SWAP_FEE_PERCENT: 1,

    // Límites
    MIN_SWAP_GAME: 10,       // Mínimo 10 $GAME
    MIN_SWAP_CHESS: 1,       // Mínimo 1 CHESS
    MAX_DAILY_SWAP: 100000,  // Máximo 100k $GAME/día

    // Balance inicial para nuevos usuarios
    INITIAL_GAME_BALANCE: 500,

    // Decimales
    GAME_DECIMALS: 0,  // $GAME no tiene decimales
    CHESS_DECIMALS: 6  // CHESS tiene 6 decimales (SPL estándar)
}

/**
 * Calcula la cantidad de $GAME que recibirás por CHESS
 */
export function calculateChessToGame(chessAmount) {
    const gameAmount = chessAmount * TOKEN_CONFIG.CHESS_TO_GAME_RATE
    const fee = gameAmount * (TOKEN_CONFIG.SWAP_FEE_PERCENT / 100)
    return {
        grossAmount: gameAmount,
        fee: Math.floor(fee),
        netAmount: Math.floor(gameAmount - fee)
    }
}

/**
 * Calcula la cantidad de CHESS que recibirás por $GAME
 */
export function calculateGameToChess(gameAmount) {
    const chessAmount = gameAmount * TOKEN_CONFIG.GAME_TO_CHESS_RATE
    const fee = chessAmount * (TOKEN_CONFIG.SWAP_FEE_PERCENT / 100)
    return {
        grossAmount: chessAmount,
        fee: fee,
        netAmount: parseFloat((chessAmount - fee).toFixed(6))
    }
}

/**
 * Valida si un swap es válido
 */
export function validateSwap(fromToken, amount, userBalance) {
    const errors = []

    if (fromToken === 'GAME') {
        if (amount < TOKEN_CONFIG.MIN_SWAP_GAME) {
            errors.push(`Mínimo ${TOKEN_CONFIG.MIN_SWAP_GAME} $GAME para swap`)
        }
    } else if (fromToken === 'CHESS') {
        if (amount < TOKEN_CONFIG.MIN_SWAP_CHESS) {
            errors.push(`Mínimo ${TOKEN_CONFIG.MIN_SWAP_CHESS} CHESS para swap`)
        }
    }

    if (amount > userBalance) {
        errors.push('Balance insuficiente')
    }

    if (amount <= 0) {
        errors.push('La cantidad debe ser mayor a 0')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Formatea cantidad de $GAME para mostrar
 */
export function formatGameAmount(amount) {
    return new Intl.NumberFormat('en-US').format(Math.floor(amount))
}

/**
 * Formatea cantidad de CHESS para mostrar
 */
export function formatChessAmount(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
    }).format(amount)
}

/**
 * Obtiene el valor en USD de $GAME (basado en precio CHESS)
 * @param {number} gameAmount - Cantidad de $GAME
 * @param {number} chessPrice - Precio de CHESS en USD
 */
export function getGameUsdValue(gameAmount, chessPrice = 0.01) {
    const chessEquivalent = gameAmount * TOKEN_CONFIG.GAME_TO_CHESS_RATE
    return (chessEquivalent * chessPrice).toFixed(4)
}

/**
 * Genera un ID único para transacciones de swap
 */
export function generateSwapId() {
    return `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
