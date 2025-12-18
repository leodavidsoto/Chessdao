'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, Star, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useTonConnect } from '@/hooks/useTonConnect'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'

// Telegram Stars packages
const STARS_PACKAGES = [
    { stars: 50, chess: 100, bonus: 0, popular: false },
    { stars: 100, chess: 200, bonus: 20, popular: true },
    { stars: 250, chess: 550, bonus: 50, popular: false },
    { stars: 500, chess: 1200, bonus: 200, popular: false },
    { stars: 1000, chess: 2500, bonus: 500, popular: false },
]

// TON packages
const TON_PACKAGES = [
    { ton: 0.5, chess: 500, usd: 2.50 },
    { ton: 1, chess: 1000, usd: 5.00 },
    { ton: 2, chess: 2200, usd: 10.00, bonus: 200 },
    { ton: 5, chess: 5500, usd: 25.00, bonus: 500 },
    { ton: 10, chess: 12000, usd: 50.00, bonus: 2000 },
]

// Payment wallet address
const PAYMENT_WALLET = process.env.NEXT_PUBLIC_TON_PAYMENT_WALLET || 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI'

export default function TokenPurchaseTON({ onClose }) {
    const { address, balance, isConnected, actions } = useTonConnect()
    const { webApp, telegramUser, actions: telegramActions } = useTelegramWebApp()
    const [loading, setLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('STARS')
    const [selectedPackage, setSelectedPackage] = useState(null)

    // TON payment state
    const [paymentStep, setPaymentStep] = useState('select') // 'select', 'pay', 'verifying', 'success'
    const [paymentId, setPaymentId] = useState(null)
    const [verifying, setVerifying] = useState(false)

    // Handle Telegram Stars purchase
    const handleStarsPurchase = async (pkg) => {
        if (!webApp) {
            toast.error('Solo disponible en Telegram')
            return
        }

        setLoading(true)
        try {
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
                toast.info('Abriendo opciones de pago...')
                if (webApp.openTelegramLink) {
                    webApp.openTelegramLink(`https://t.me/ChessDAObot?start=buy_${pkg.stars}`)
                }
                setLoading(false)
            }
        } catch (error) {
            console.error('Stars purchase error:', error)
            toast.info('Abriendo bot de pagos...')
            if (webApp?.openTelegramLink) {
                webApp.openTelegramLink(`https://t.me/ChessDAObot?start=buy_${pkg.stars}`)
            }
            setLoading(false)
        }
    }

    // Handle TON purchase - CREATE PAYMENT
    const handleTONPurchase = async (pkg) => {
        if (!isConnected) {
            toast.error('Conecta tu wallet TON primero')
            return
        }

        if (balance !== null && balance < pkg.ton) {
            toast.error('Saldo insuficiente', {
                description: `Necesitas ${pkg.ton} TON, tienes ${balance.toFixed(2)} TON`
            })
            return
        }

        setLoading(true)
        try {
            // Create payment request on our server
            const response = await fetch('/api/payments/ton', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tonAmount: pkg.ton,
                    userId: telegramUser?.id || address,
                    walletAddress: address,
                })
            })

            const data = await response.json()

            if (data.success) {
                setPaymentId(data.paymentId)
                setPaymentStep('pay')
                toast.success('¡Orden creada!', {
                    description: 'Ahora envía el pago desde tu wallet'
                })
            } else {
                toast.error('Error al crear orden', { description: data.error })
            }
        } catch (error) {
            console.error('TON payment error:', error)
            toast.error('Error de conexión')
        }
        setLoading(false)
    }

    // Open wallet to send payment
    const openWalletToPay = () => {
        if (!selectedPackage || !paymentId) return

        // Create TON deep link for payment
        const tonAmount = selectedPackage.ton
        const comment = paymentId

        // Universal TON payment link
        const tonLink = `ton://transfer/${PAYMENT_WALLET}?amount=${tonAmount * 1e9}&text=${encodeURIComponent(comment)}`

        // Try opening in Telegram WebApp first
        if (webApp?.openLink) {
            webApp.openLink(tonLink)
        } else {
            window.open(tonLink, '_blank')
        }

        // Also provide Tonkeeper specific link as fallback
        const tonkeeperLink = `https://app.tonkeeper.com/transfer/${PAYMENT_WALLET}?amount=${tonAmount * 1e9}&text=${encodeURIComponent(comment)}`

        toast.info('Abriendo wallet...', {
            description: 'Confirma la transacción en tu wallet',
            action: {
                label: 'Tonkeeper',
                onClick: () => window.open(tonkeeperLink, '_blank')
            }
        })
    }

    // Verify payment on blockchain
    const verifyPayment = useCallback(async () => {
        if (!paymentId || !selectedPackage) return

        setVerifying(true)
        try {
            const response = await fetch('/api/payments/ton/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId,
                    userId: telegramUser?.id || address,
                    expectedAmount: selectedPackage.ton,
                })
            })

            const data = await response.json()

            if (data.verified) {
                setPaymentStep('success')
                toast.success('¡Pago confirmado!', {
                    description: `Has recibido ${selectedPackage.chess + (selectedPackage.bonus || 0)} CHESS tokens`
                })

                // Haptic feedback
                if (telegramActions?.hapticFeedback) {
                    telegramActions.hapticFeedback('success')
                }

                // Close after success
                setTimeout(() => {
                    onClose()
                    window.location.reload()
                }, 3000)
            } else {
                toast.info('Esperando confirmación...', {
                    description: data.message || 'La transacción aún no se ha detectado'
                })
            }
        } catch (error) {
            console.error('Verification error:', error)
            toast.error('Error al verificar')
        }
        setVerifying(false)
    }, [paymentId, selectedPackage, telegramUser, address, telegramActions, onClose])

    // Auto-verify every 5 seconds when in pay step
    useEffect(() => {
        if (paymentStep === 'pay' && paymentId) {
            const interval = setInterval(() => {
                verifyPayment()
            }, 5000)
            return () => clearInterval(interval)
        }
    }, [paymentStep, paymentId, verifyPayment])

    // Copy payment ID to clipboard
    const copyPaymentId = () => {
        navigator.clipboard.writeText(paymentId)
        toast.success('Copiado al portapapeles')
    }

    // Reset TON payment flow
    const resetPayment = () => {
        setPaymentStep('select')
        setPaymentId(null)
        setSelectedPackage(null)
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
                    {paymentStep === 'select' && (
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
                    )}

                    {/* Stars Packages */}
                    {paymentMethod === 'STARS' && paymentStep === 'select' && (
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
                                    <>⭐ Comprar con Stars</>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* TON Packages - Select Step */}
                    {paymentMethod === 'TON' && paymentStep === 'select' && (
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

                            {isConnected && (
                                <div className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-center">
                                    <span className="text-slate-300 text-sm">Tu balance:</span>
                                    <span className="text-cyan-400 font-bold">{balance?.toFixed(2) || '0'} TON</span>
                                </div>
                            )}

                            <Button
                                onClick={() => selectedPackage && handleTONPurchase(selectedPackage)}
                                disabled={loading || !selectedPackage || !isConnected}
                                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold h-12 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Creando orden...
                                    </>
                                ) : (
                                    <>💎 Comprar con TON</>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* TON Payment - Pay Step */}
                    {paymentMethod === 'TON' && paymentStep === 'pay' && selectedPackage && (
                        <div className="space-y-4">
                            <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-xl p-4 text-center">
                                <h3 className="text-lg font-bold text-white mb-2">Envía el pago</h3>
                                <div className="text-3xl font-bold text-cyan-400 mb-1">
                                    {selectedPackage.ton} TON
                                </div>
                                <p className="text-sm text-slate-300">
                                    Recibirás {selectedPackage.chess + (selectedPackage.bonus || 0)} CHESS
                                </p>
                            </div>

                            {/* Payment Details */}
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Dirección de pago:</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-xs text-white bg-slate-800 p-2 rounded flex-1 break-all">
                                            {PAYMENT_WALLET}
                                        </code>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                navigator.clipboard.writeText(PAYMENT_WALLET)
                                                toast.success('Dirección copiada')
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400">Comentario (IMPORTANTE):</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-sm text-yellow-400 bg-slate-800 p-2 rounded flex-1">
                                            {paymentId}
                                        </code>
                                        <Button size="sm" variant="ghost" onClick={copyPaymentId}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-orange-400 mt-1">
                                        ⚠️ Incluye este comentario exacto en tu transacción
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <Button
                                onClick={openWalletToPay}
                                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 h-12 text-lg font-bold"
                            >
                                💎 Abrir Wallet para Pagar
                            </Button>

                            <Button
                                onClick={verifyPayment}
                                disabled={verifying}
                                variant="outline"
                                className="w-full border-cyan-500/50 text-cyan-400"
                            >
                                {verifying ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Verificar Pago
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-slate-400">
                                El pago se verifica automáticamente cada 5 segundos
                            </p>

                            <Button
                                variant="ghost"
                                onClick={resetPayment}
                                className="w-full text-slate-400"
                            >
                                ← Elegir otro paquete
                            </Button>
                        </div>
                    )}

                    {/* Success Step */}
                    {paymentStep === 'success' && selectedPackage && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">¡Pago Exitoso!</h3>
                            <p className="text-lg text-green-400 mb-4">
                                +{selectedPackage.chess + (selectedPackage.bonus || 0)} CHESS tokens
                            </p>
                            <p className="text-sm text-slate-400">
                                Los tokens han sido acreditados a tu cuenta
                            </p>
                        </div>
                    )}

                    {/* Info */}
                    {paymentStep === 'select' && (
                        <>
                            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-slate-300">
                                        <p className="font-semibold text-blue-300 mb-1">¿Cómo funciona?</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>⭐ Stars: Pago instantáneo dentro de Telegram</li>
                                            <li>💎 TON: Pago desde tu wallet TON conectada</li>
                                            <li>Tokens CHESS se acreditan de inmediato</li>
                                            <li>Úsalos para jugar y apostar en partidas</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

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
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
