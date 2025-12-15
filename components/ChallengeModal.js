'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Swords,
    Clock,
    Coins,
    X,
    Zap,
    Send,
    AlertCircle
} from 'lucide-react'
import { useChallenges } from '@/hooks/useChallenges'
import { useGameTokens } from '@/hooks/useGameTokens'
import { toast } from 'sonner'

// Time control options
const TIME_CONTROLS = [
    { value: '1+0', label: 'Bullet 1 min', icon: '⚡' },
    { value: '3+0', label: 'Blitz 3 min', icon: '🔥' },
    { value: '5+0', label: 'Blitz 5 min', icon: '🔥' },
    { value: '5+3', label: 'Blitz 5+3', icon: '🔥' },
    { value: '10+0', label: 'Rapid 10 min', icon: '⏱️' },
    { value: '15+10', label: 'Rapid 15+10', icon: '⏱️' },
    { value: '30+0', label: 'Classical 30', icon: '♟️' }
]

// Bet presets
const BET_PRESETS = [0, 10, 25, 50, 100, 250, 500]

export default function ChallengeModal({ opponent, onClose, onChallengeAccepted }) {
    const { publicKey } = useWallet()
    const { actions: { sendChallenge } } = useChallenges()
    const { gameBalance, actions: { formatAmount } } = useGameTokens()

    const [sending, setSending] = useState(false)
    const [formData, setFormData] = useState({
        timeControl: '10+0',
        betAmount: 0,
        color: 'random',
        message: ''
    })

    const canAffordBet = gameBalance >= formData.betAmount
    const canSend = opponent && canAffordBet && !sending

    const handleSend = async () => {
        if (!canSend) return

        setSending(true)

        try {
            const result = await sendChallenge(opponent.walletAddress, {
                timeControl: formData.timeControl,
                betAmount: formData.betAmount,
                color: formData.color,
                message: formData.message
            })

            if (result.success) {
                toast.success(`¡Desafío enviado a ${opponent.username}!`)
                onClose()
            } else {
                toast.error(result.error || 'Error al enviar desafío')
            }
        } catch (error) {
            toast.error('Error al enviar desafío')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 max-w-md w-full shadow-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Swords className="h-6 w-6 text-orange-400" />
                            Enviar Desafío
                        </CardTitle>
                        <Button variant="ghost" onClick={onClose} className="text-slate-400">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-5">
                    {/* Opponent */}
                    <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl">
                            {opponent?.avatar || '♟️'}
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-white">{opponent?.username}</div>
                            <div className="text-sm text-slate-400">
                                ⭐ {opponent?.rating || 1200} Rating
                            </div>
                        </div>
                        {opponent?.isOnline && (
                            <Badge className="bg-green-600">Online</Badge>
                        )}
                    </div>

                    {/* Time Control */}
                    <div>
                        <Label className="text-slate-300 flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4" />
                            Control de Tiempo
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {TIME_CONTROLS.map(tc => (
                                <button
                                    key={tc.value}
                                    onClick={() => setFormData(prev => ({ ...prev, timeControl: tc.value }))}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.timeControl === tc.value
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    <span>{tc.icon}</span>
                                    <span>{tc.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bet Amount */}
                    <div>
                        <Label className="text-slate-300 flex items-center gap-2 mb-2">
                            <Coins className="h-4 w-4 text-yellow-400" />
                            Apuesta ($GAME)
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {BET_PRESETS.map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setFormData(prev => ({ ...prev, betAmount: amount }))}
                                    disabled={amount > gameBalance}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.betAmount === amount
                                            ? 'bg-yellow-500 text-black'
                                            : amount > gameBalance
                                                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    {amount === 0 ? 'Sin apuesta' : `${amount}`}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={formData.betAmount}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    betAmount: Math.max(0, parseInt(e.target.value) || 0)
                                }))}
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Cantidad"
                            />
                            <div className="text-sm text-slate-400 whitespace-nowrap">
                                Balance: {formatAmount(gameBalance)}
                            </div>
                        </div>
                        {!canAffordBet && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Balance insuficiente
                            </p>
                        )}
                    </div>

                    {/* Color Selection */}
                    <div>
                        <Label className="text-slate-300 mb-2 block">Tu Color</Label>
                        <div className="flex gap-2">
                            {[
                                { value: 'random', label: '🎲 Aleatorio' },
                                { value: 'white', label: '⬜ Blancas' },
                                { value: 'black', label: '⬛ Negras' }
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setFormData(prev => ({ ...prev, color: option.value }))}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.color === option.value
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <Label className="text-slate-300 mb-2 block">
                            Mensaje (opcional)
                        </Label>
                        <Input
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="¿Te atreves?"
                            maxLength={100}
                            className="bg-slate-700 border-slate-600 text-white"
                        />
                    </div>

                    {/* Summary */}
                    {(formData.betAmount > 0 || formData.timeControl !== '10+0') && (
                        <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
                            <div className="text-slate-400 mb-1">Resumen del desafío:</div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-blue-500 text-blue-400">
                                    ⏱️ {formData.timeControl}
                                </Badge>
                                {formData.betAmount > 0 && (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                                        🎮 {formData.betAmount} $GAME
                                    </Badge>
                                )}
                                {formData.betAmount > 0 && (
                                    <Badge variant="outline" className="border-green-500 text-green-400">
                                        🏆 Pot: {formData.betAmount * 2} $GAME
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-slate-600"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSend}
                            disabled={!canSend}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                        >
                            {sending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    ¡Desafiar!
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
