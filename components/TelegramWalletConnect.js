'use client'

import { useState, useEffect } from 'react'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { User, Wallet, Link2, CheckCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

/**
 * TelegramWalletConnect - Alternative connection for Telegram Mini App
 * Uses Telegram user ID and allows linking a Solana wallet address
 */
export default function TelegramWalletConnect({ onConnect }) {
    const { isInTelegram, telegramUser, isReady, actions } = useTelegramWebApp()
    const [walletAddress, setWalletAddress] = useState('')
    const [isLinked, setIsLinked] = useState(false)
    const [loading, setLoading] = useState(false)
    const [linkedWallet, setLinkedWallet] = useState(null)

    // Check if wallet is already linked
    useEffect(() => {
        if (telegramUser?.id) {
            checkLinkedWallet()
        }
    }, [telegramUser])

    const checkLinkedWallet = async () => {
        try {
            const res = await fetch(`/api/telegram/wallet?telegramId=${telegramUser.id}`)
            if (res.ok) {
                const data = await res.json()
                if (data.wallet) {
                    setLinkedWallet(data.wallet)
                    setIsLinked(true)
                    onConnect?.({
                        type: 'telegram',
                        telegramId: telegramUser.id,
                        wallet: data.wallet,
                        user: telegramUser
                    })
                }
            }
        } catch (error) {
            console.log('No linked wallet found')
        }
    }

    const handleLinkWallet = async () => {
        if (!walletAddress || walletAddress.length < 32) {
            toast.error('Por favor ingresa una dirección de wallet válida')
            actions.hapticFeedback('error')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/telegram/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: telegramUser.id,
                    telegramUsername: telegramUser.username,
                    walletAddress: walletAddress
                })
            })

            if (res.ok) {
                setIsLinked(true)
                setLinkedWallet(walletAddress)
                toast.success('¡Wallet vinculada exitosamente!')
                actions.hapticFeedback('success')

                onConnect?.({
                    type: 'telegram',
                    telegramId: telegramUser.id,
                    wallet: walletAddress,
                    user: telegramUser
                })
            } else {
                throw new Error('Failed to link wallet')
            }
        } catch (error) {
            toast.error('Error al vincular wallet')
            actions.hapticFeedback('error')
        } finally {
            setLoading(false)
        }
    }

    const handleContinueAsGuest = () => {
        actions.hapticFeedback('light')
        onConnect?.({
            type: 'telegram-guest',
            telegramId: telegramUser?.id,
            wallet: null,
            user: telegramUser
        })
    }

    if (!isReady) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
            </div>
        )
    }

    // Already linked
    if (isLinked && linkedWallet) {
        return (
            <Card className="bg-slate-800/50 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Conectado</h3>
                            <p className="text-sm text-slate-400">@{telegramUser?.username || telegramUser?.firstName}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Wallet Vinculada</p>
                        <p className="text-sm text-white font-mono truncate">{linkedWallet}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-white">
                            ¡Hola, {telegramUser?.firstName || 'Usuario'}!
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Estás usando ChessDAO desde Telegram
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Link wallet section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Wallet className="w-4 h-4" />
                        <span>Vincula tu wallet de Solana para jugar con tokens reales</span>
                    </div>

                    <Input
                        placeholder="Tu dirección de wallet (ej: 3bbd...cGo)"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                    />

                    <Button
                        onClick={handleLinkWallet}
                        disabled={loading || !walletAddress}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                            <Link2 className="w-4 h-4 mr-2" />
                        )}
                        Vincular Wallet
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-800 px-2 text-slate-500">o</span>
                    </div>
                </div>

                {/* Continue as guest */}
                <Button
                    variant="outline"
                    onClick={handleContinueAsGuest}
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                    <User className="w-4 h-4 mr-2" />
                    Continuar como invitado
                </Button>

                <p className="text-xs text-slate-500 text-center">
                    Como invitado podrás explorar pero necesitarás vincular una wallet para jugar con apuestas
                </p>
            </CardContent>
        </Card>
    )
}
