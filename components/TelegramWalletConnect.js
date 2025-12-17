'use client'

import { useState, useEffect } from 'react'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import TonWalletConnect from '@/components/TonWalletConnect'
import { User } from 'lucide-react'

/**
 * TelegramWalletConnect - Connection handler for Telegram Mini App
 * Uses TON blockchain (not Solana/Phantom) for native Telegram integration
 */
export default function TelegramWalletConnect({ onConnect }) {
    const { isInTelegram, telegramUser, isReady, actions } = useTelegramWebApp()
    const [connectionData, setConnectionData] = useState(null)

    // Handle TON wallet connection
    const handleTonConnect = (data) => {
        console.log('TON Wallet connected:', data)
        setConnectionData(data)
        onConnect?.({
            type: 'ton',
            address: data.address,
            balance: data.balance,
            telegramUser: data.telegramUser
        })
    }

    if (!isReady) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
            </div>
        )
    }

    // Show Telegram header + TON wallet connect
    return (
        <div className="space-y-4">
            {/* Telegram user header */}
            {telegramUser && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-900/20 rounded-xl border border-blue-500/20">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">
                            ¡Hola, {telegramUser.firstName}!
                        </p>
                        <p className="text-xs text-blue-300">
                            @{telegramUser.username || 'telegram'} • ChessDAO Mini App
                        </p>
                    </div>
                    {telegramUser.isPremium && (
                        <span className="ml-auto text-lg">⭐</span>
                    )}
                </div>
            )}

            {/* TON Wallet Connection - replaces Phantom for Telegram */}
            <TonWalletConnect onConnect={handleTonConnect} />
        </div>
    )
}
