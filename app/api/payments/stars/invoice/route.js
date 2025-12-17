import { NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * POST /api/payments/stars/invoice
 * Create a Telegram Stars invoice link
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { stars, chess, telegramUserId } = body

        if (!stars || !chess) {
            return NextResponse.json(
                { error: 'stars and chess amounts are required' },
                { status: 400 }
            )
        }

        if (!TELEGRAM_BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN not configured')
            return NextResponse.json(
                { error: 'Bot token not configured', fallback: true },
                { status: 500 }
            )
        }

        // Create invoice using Telegram Bot API
        const invoiceResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `${chess} CHESS Tokens`,
                    description: `Compra ${chess} CHESS tokens para jugar y apostar en ChessDAO`,
                    payload: JSON.stringify({
                        type: 'stars_purchase',
                        stars,
                        chess,
                        userId: telegramUserId,
                        timestamp: Date.now()
                    }),
                    provider_token: '', // Empty for Telegram Stars
                    currency: 'XTR', // XTR = Telegram Stars
                    prices: [{ label: 'CHESS Tokens', amount: stars }]
                })
            }
        )

        const invoiceData = await invoiceResponse.json()

        if (!invoiceData.ok) {
            console.error('Telegram API error:', invoiceData)
            return NextResponse.json({
                error: 'Failed to create invoice',
                details: invoiceData.description,
                fallback: true
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            invoiceLink: invoiceData.result,
            stars,
            chess
        })

    } catch (error) {
        console.error('Stars invoice error:', error)
        return NextResponse.json({
            error: 'Failed to create invoice',
            details: error.message,
            fallback: true
        }, { status: 500 })
    }
}
