'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Coins, Star, Zap, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useTonConnect } from '@/hooks/useTonConnect'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'

const CHESS_TOKEN_PRICE = 0.01 // $0.01 USD per CHESS token

// Telegram Stars packages
const STARS_PACKAGES = [
    { stars: 50, chess: 100, bonus: 0, popular: false },
    { stars: 100, chess: 200, bonus: 20, popular: true },
    { stars: 250, chess: 550, bonus: 50, popular: false },
    { stars: 500, chess: 1200, bonus: 200, popular: false },
    { stars: 1000, chess: 2500, bonus: 500, popular: false },
]

// TON packages (approximate prices)
const TON_PACKAGES = [
    { ton: 0.5, chess: 500, usd: 2.50 },
    { ton: 1, chess: 1000, usd: 5.00 },
    { ton: 2, chess: 2200, usd: 10.00, bonus: 200 },
    { ton: 5, chess: 5500, usd: 25.00, bonus: 500 },
    { ton: 10, chess: 12000, usd: 50.00, bonus: 2000 },
]

export default function TokenPurchaseTON({ onClose }) {
    const { address, balance, isConnected } = useTonConnect()
    const { webApp, telegramUser } = useTelegramWebApp()
    const [loading, setLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('STARS') // 'STARS' or 'TON'
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [customAmount, setCustomAmount] = useState('')

    // Handle Telegram Stars purchase
    const handleStarsPurchase = async (pkg) => {
        if (!webApp) {
            toast.error('Solo disponible en Telegram')
            return
        }

        setLoading(true)
        try {
            // Try to create invoice via our API
            const response = await fetch('/api/payments/stars/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stars: pkg.stars,
                    chess: pkg.chess + (pkg.bonus || 0),
                    telegramUserId: telegramUser?.id
                })
            })

            const data = await response.json()

            if (data.invoiceLink && webApp.openInvoice) {
                // Open native Telegram invoice
                webApp.openInvoice(data.invoiceLink, (status) => {
                    if (status === 'paid') {
                        toast.success('¡Compra exitosa!', {
                            description: `Has recibido ${pkg.chess + (pkg.bonus || 0)} CHESS tokens`
                        })
                        setTimeout(() => {
                            onClose()
                            window.location.reload()
                        }, 2000)
                    } else if (status === 'cancelled') {
                        toast.info('Compra cancelada')
                    } else if (status === 'failed') {
                        toast.error('Error en el pago')
                    }
                    setLoading(false)
                })
            } else {
                // Fallback: Open bot with /buy command
                toast.info('Abriendo opciones de pago...', {
                    description: 'Usa el comando /buy en @ChessDAObot'
                })

                // Open bot chat with buy command
                if (webApp.openTelegramLink) {
                    webApp.openTelegramLink(`https://t.me/ChessDAObot?start=buy_${pkg.stars}`)
                } else {
                    window.open(`https://t.me/ChessDAObot?start=buy_${pkg.stars}`, '_blank')
                }
                setLoading(false)
            }
        } catch (error) {
            console.error('Stars purchase error:', error)
            // Fallback to bot
            toast.info('Abriendo bot de pagos...')
            if (webApp?.openTelegramLink) {
                webApp.openTelegramLink(`https://t.me/ChessDAObot?start=buy_${pkg.stars}`)
            } else {
                window.open(`https://t.me/ChessDAObot?start=buy_${pkg.stars}`, '_blank')
            }
            setLoading(false)
        }
    }

    // Handle TON purchase (coming soon)
    const handleTONPurchase = async (pkg) => {
        if (!isConnected) {
            toast.error('Conecta tu wallet TON primero')
            return
        }

        toast.info('Pago con TON próximamente', {
            description: 'Esta función estará disponible pronto. Usa Stars por ahora.'
        })
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-800 border-slate-600 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl text-white flex items-center">
                                <Coins className="h-8 w-8 mr-3 text-yellow-400" />
                                Comprar CHESS
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Paga con Telegram Stars ⭐ o TON 💎
                            </CardDescription>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="text-slate-400" disabled={loading}>
                            ✕
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Payment Method Tabs */}
                    <div className="flex gap-2">
                        <Button
                            variant={paymentMethod === 'STARS' ? 'default' : 'outline'}
                            className={paymentMethod === 'STARS'
                                ? 'flex-1 bg-gradient-to-r from-yellow-500 to-orange-500'
                                : 'flex-1 border-slate-600'}
                            onClick={() => setPaymentMethod('STARS')}
                        >
                            ⭐ Telegram Stars
                        </Button>
                        <Button
                            variant={paymentMethod === 'TON' ? 'default' : 'outline'}
                            className={paymentMethod === 'TON'
                                ? 'flex-1 bg-gradient-to-r from-blue-500 to-cyan-500'
                                : 'flex-1 border-slate-600'}
                            onClick={() => setPaymentMethod('TON')}
                        >
                            💎 TON
                        </Button>
                    </div>

                    {/* Stars Packages */}
                    {paymentMethod === 'STARS' && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-300">Selecciona un paquete</h4>
                            {STARS_PACKAGES.map((pkg, idx) => (
                                <Card
                                    key={idx}
                                    className={`cursor-pointer transition-all border-2 ${selectedPackage === pkg
                                        ? 'border-yellow-500 bg-yellow-900/20'
                                        : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                                        }`}
                                    onClick={() => setSelectedPackage(pkg)}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">⭐</div>
                                            <div>
                                                <div className="text-white font-semibold">
                                                    {pkg.stars} Stars
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    ≈ ${(pkg.stars / 40).toFixed(2)} USD
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-yellow-400 font-bold">
                                                {pkg.chess + pkg.bonus} CHESS
                                            </div>
                                            {pkg.bonus > 0 && (
                                                <Badge className="bg-green-600 text-xs">+{pkg.bonus} bonus</Badge>
                                            )}
                                            {pkg.popular && (
                                                <Badge className="bg-orange-500 text-xs ml-1">Popular</Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Buy Button */}
                            <Button
                                onClick={() => selectedPackage && handleStarsPurchase(selectedPackage)}
                                disabled={loading || !selectedPackage}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold h-12 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        ⭐ Comprar con Stars
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* TON Packages */}
                    {paymentMethod === 'TON' && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-300">Paquetes con TON</h4>

                            {!isConnected && (
                                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
                                    <p className="text-blue-300 text-sm">Conecta tu wallet TON para continuar</p>
                                </div>
                            )}

                            {TON_PACKAGES.map((pkg, idx) => (
                                <Card
                                    key={idx}
                                    className={`cursor-pointer transition-all border-2 ${selectedPackage === pkg
                                        ? 'border-cyan-500 bg-cyan-900/20'
                                        : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                                        } ${!isConnected ? 'opacity-50' : ''}`}
                                    onClick={() => isConnected && setSelectedPackage(pkg)}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">💎</div>
                                            <div>
                                                <div className="text-white font-semibold">
                                                    {pkg.ton} TON
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    ≈ ${pkg.usd.toFixed(2)} USD
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-cyan-400 font-bold">
                                                {pkg.chess} CHESS
                                            </div>
                                            {pkg.bonus && (
                                                <Badge className="bg-green-600 text-xs">+{pkg.bonus} bonus</Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* TON Balance */}
                            {isConnected && (
                                <div className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-center">
                                    <span className="text-slate-300 text-sm">Tu balance:</span>
                                    <span className="text-cyan-400 font-bold">{balance?.toFixed(2) || '0'} TON</span>
                                </div>
                            )}

                            {/* Buy Button */}
                            <Button
                                onClick={() => selectedPackage && handleTONPurchase(selectedPackage)}
                                disabled={loading || !selectedPackage || !isConnected}
                                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold h-12 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        💎 Comprar con TON (Próximamente)
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-slate-300">
                                <p className="font-semibold text-blue-300 mb-1">¿Cómo funciona?</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>⭐ Stars: Pago instantáneo dentro de Telegram</li>
                                    <li>💎 TON: Pago con tu wallet TON conectada</li>
                                    <li>Tokens CHESS se acreditan de inmediato</li>
                                    <li>Úsalos para jugar y apostar en partidas</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Bot link for Stars */}
                    <div className="text-center">
                        <a
                            href="https://t.me/ChessDAObot?start=buy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1"
                        >
                            También puedes usar /buy en @ChessDAObot
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
