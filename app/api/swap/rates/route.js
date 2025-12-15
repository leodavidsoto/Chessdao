import { NextResponse } from 'next/server'
import { TOKEN_CONFIG, calculateChessToGame, calculateGameToChess } from '@/lib/gameTokens'

/**
 * GET /api/swap/rates
 * Obtiene las tasas de conversión actuales
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const amount = parseFloat(searchParams.get('amount') || '1')
        const fromToken = searchParams.get('from') || 'CHESS'

        // Calcular conversión de ejemplo
        let exampleConversion
        if (fromToken === 'CHESS') {
            exampleConversion = calculateChessToGame(amount)
        } else {
            exampleConversion = calculateGameToChess(amount)
        }

        return NextResponse.json({
            rates: {
                chessToGame: TOKEN_CONFIG.CHESS_TO_GAME_RATE,
                gameToChess: TOKEN_CONFIG.GAME_TO_CHESS_RATE
            },
            fees: {
                swapFeePercent: TOKEN_CONFIG.SWAP_FEE_PERCENT,
                description: `${TOKEN_CONFIG.SWAP_FEE_PERCENT}% fee on all swaps`
            },
            limits: {
                minSwapGame: TOKEN_CONFIG.MIN_SWAP_GAME,
                minSwapChess: TOKEN_CONFIG.MIN_SWAP_CHESS,
                maxDailySwap: TOKEN_CONFIG.MAX_DAILY_SWAP
            },
            example: {
                from: fromToken,
                amount: amount,
                grossAmount: exampleConversion.grossAmount,
                fee: exampleConversion.fee,
                netAmount: exampleConversion.netAmount,
                to: fromToken === 'CHESS' ? 'GAME' : 'CHESS'
            },
            tokens: {
                game: {
                    name: TOKEN_CONFIG.GAME_TOKEN_NAME,
                    symbol: TOKEN_CONFIG.GAME_TOKEN_SYMBOL,
                    decimals: TOKEN_CONFIG.GAME_DECIMALS,
                    type: 'internal',
                    description: 'Token interno para juegos y apuestas'
                },
                chess: {
                    name: TOKEN_CONFIG.CHESS_TOKEN_NAME,
                    symbol: TOKEN_CONFIG.CHESS_TOKEN_SYMBOL,
                    decimals: TOKEN_CONFIG.CHESS_DECIMALS,
                    type: 'spl',
                    description: 'Token SPL en Solana blockchain'
                }
            },
            lastUpdated: new Date().toISOString()
        })

    } catch (error) {
        console.error('Rates API error:', error)
        return NextResponse.json(
            { error: 'Failed to get rates' },
            { status: 500 }
        )
    }
}
