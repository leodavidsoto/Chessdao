'use client'

import { useState } from 'react'
import { useDailyChallenge } from '@/hooks/useDailyChallenge'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Sparkles,
    Lock,
    Unlock,
    Gift,
    Check,
    X,
    Loader2,
    Share2,
    Search,
    ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

const COMBO_CARDS = ['♔', '♕', '♖', '♗', '♘', '♙', '🏆', '⚔️', '💎', '🎮', '🔥', '👑']

/**
 * DailyChallenge - Daily Combo and Cipher panel
 * Designed to drive viral external searches
 */
export default function DailyChallenge({ walletAddress, onClose }) {
    const { challengeData, loading, submitting, error, actions } = useDailyChallenge(walletAddress)
    const { isInTelegram, actions: tgActions } = useTelegramWebApp()

    const [activeTab, setActiveTab] = useState('combo') // 'combo' or 'cipher'
    const [comboSelection, setComboSelection] = useState([])
    const [cipherInput, setCipherInput] = useState('')
    const [resultMessage, setResultMessage] = useState(null)

    const handleCardClick = (card) => {
        if (comboSelection.length < 3) {
            setComboSelection([...comboSelection, card])
        }
    }

    const resetCombo = () => {
        setComboSelection([])
        setResultMessage(null)
    }

    const submitCombo = async () => {
        if (comboSelection.length !== 3) {
            toast.error('Selecciona 3 cartas')
            return
        }

        const result = await actions.submitCombo(comboSelection)

        if (result?.correct) {
            toast.success(result.message)
            if (isInTelegram) tgActions.hapticFeedback('success')
            setResultMessage({ success: true, message: result.message, shareMessage: result.shareMessage })
        } else if (result) {
            toast.error(result.message)
            if (isInTelegram) tgActions.hapticFeedback('error')
            setResultMessage({ success: false, message: result.message })
        }

        setComboSelection([])
    }

    const submitCipher = async () => {
        if (!cipherInput.trim()) {
            toast.error('Ingresa la palabra')
            return
        }

        const result = await actions.submitCipher(cipherInput.trim())

        if (result?.correct) {
            toast.success(result.message)
            if (isInTelegram) tgActions.hapticFeedback('success')
            setResultMessage({ success: true, message: result.message, shareMessage: result.shareMessage })
        } else if (result) {
            toast.error(result.message)
            if (isInTelegram) tgActions.hapticFeedback('error')
            setResultMessage({ success: false, message: result.message })
        }

        setCipherInput('')
    }

    const handleShare = (shareMessage) => {
        const shareUrl = `https://t.me/ChessDAObot`
        const fullMessage = `${shareMessage}\n\n${shareUrl}`

        if (isInTelegram) {
            tgActions.shareUrl(shareUrl, shareMessage)
        } else {
            navigator.clipboard.writeText(fullMessage)
            toast.success('Copiado al portapapeles')
        }
    }

    const searchSolution = () => {
        const query = activeTab === 'combo'
            ? 'ChessDAO daily combo today'
            : 'ChessDAO daily cipher today'
        window.open(`https://twitter.com/search?q=${encodeURIComponent(query)}`, '_blank')
    }

    if (loading && !challengeData) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            </div>
        )
    }

    const combo = challengeData?.combo
    const cipher = challengeData?.cipher

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 border-yellow-500/30 max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-8 h-8" />
                            <div>
                                <CardTitle className="text-2xl">Desafío Diario</CardTitle>
                                <p className="text-sm text-white/80">{challengeData?.date}</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">
                            ✕
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <Button
                            variant={activeTab === 'combo' ? 'default' : 'outline'}
                            onClick={() => { setActiveTab('combo'); setResultMessage(null) }}
                            className={`flex-1 ${activeTab === 'combo' ? 'bg-yellow-600' : ''}`}
                        >
                            🎯 Combo
                        </Button>
                        <Button
                            variant={activeTab === 'cipher' ? 'default' : 'outline'}
                            onClick={() => { setActiveTab('cipher'); setResultMessage(null) }}
                            className={`flex-1 ${activeTab === 'cipher' ? 'bg-purple-600' : ''}`}
                        >
                            🔐 Cifrado
                        </Button>
                    </div>

                    {/* Combo Tab */}
                    {activeTab === 'combo' && (
                        <div className="space-y-4">
                            {combo?.solved ? (
                                <Card className="bg-green-900/30 border-green-500">
                                    <CardContent className="p-4 text-center">
                                        <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-green-400">¡Combo Resuelto!</h3>
                                        <p className="text-green-300">Has ganado {combo.reward?.toLocaleString()} $GAME hoy</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <Card className="bg-slate-800/50 border-slate-700">
                                        <CardContent className="p-4 text-center">
                                            <p className="text-slate-400 text-sm mb-2">Pista de hoy:</p>
                                            <div className="text-4xl mb-2">{combo?.hint}</div>
                                            <p className="text-yellow-400 font-bold">
                                                Recompensa: {combo?.reward?.toLocaleString()} $GAME
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Intento #{(combo?.attempts || 0) + 1}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Selection Display */}
                                    <div className="flex justify-center gap-2">
                                        {[0, 1, 2].map(i => (
                                            <div
                                                key={i}
                                                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl ${comboSelection[i]
                                                        ? 'bg-yellow-600/30 border-yellow-500'
                                                        : 'bg-slate-800 border-slate-600 border-dashed'
                                                    }`}
                                            >
                                                {comboSelection[i] || '?'}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Card Grid */}
                                    <div className="grid grid-cols-6 gap-2">
                                        {COMBO_CARDS.map((card, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleCardClick(card)}
                                                disabled={comboSelection.length >= 3}
                                                className={`w-full aspect-square rounded-lg text-2xl flex items-center justify-center transition-all ${comboSelection.includes(card)
                                                        ? 'bg-yellow-600 scale-95'
                                                        : 'bg-slate-700 hover:bg-slate-600'
                                                    } disabled:opacity-50`}
                                            >
                                                {card}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={resetCombo}
                                            className="flex-1"
                                        >
                                            Resetear
                                        </Button>
                                        <Button
                                            onClick={submitCombo}
                                            disabled={comboSelection.length !== 3 || submitting}
                                            className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : null}
                                            Enviar
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Cipher Tab */}
                    {activeTab === 'cipher' && (
                        <div className="space-y-4">
                            {cipher?.solved ? (
                                <Card className="bg-green-900/30 border-green-500">
                                    <CardContent className="p-4 text-center">
                                        <Unlock className="w-12 h-12 text-green-400 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-green-400">¡Cifrado Resuelto!</h3>
                                        <p className="text-green-300">Has ganado {cipher.reward?.toLocaleString()} $GAME hoy</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <Card className="bg-slate-800/50 border-slate-700">
                                        <CardContent className="p-4 text-center">
                                            <Lock className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                                            <p className="text-slate-400 text-sm mb-2">Palabra secreta:</p>
                                            <div className="text-3xl font-mono text-purple-400 mb-2 tracking-widest">
                                                {cipher?.hint}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {cipher?.length} letras • Intento #{(cipher?.attempts || 0) + 1}
                                            </p>
                                            <p className="text-yellow-400 font-bold mt-2">
                                                Recompensa: {cipher?.reward?.toLocaleString()} $GAME
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Input
                                        value={cipherInput}
                                        onChange={(e) => setCipherInput(e.target.value.toUpperCase())}
                                        placeholder="Ingresa la palabra..."
                                        className="bg-slate-700 border-slate-600 text-center text-xl font-mono uppercase"
                                        maxLength={cipher?.length || 10}
                                    />

                                    <Button
                                        onClick={submitCipher}
                                        disabled={!cipherInput.trim() || submitting}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Unlock className="w-4 h-4 mr-2" />
                                        )}
                                        Descifrar
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Result Message */}
                    {resultMessage && (
                        <Card className={`${resultMessage.success ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'}`}>
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {resultMessage.success ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <X className="w-5 h-5 text-red-400" />
                                    )}
                                    <span className={resultMessage.success ? 'text-green-300' : 'text-red-300'}>
                                        {resultMessage.success ? '¡Correcto!' : 'Incorrecto'}
                                    </span>
                                </div>
                                {resultMessage.shareMessage && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleShare(resultMessage.shareMessage)}
                                        className="bg-blue-600"
                                    >
                                        <Share2 className="w-4 h-4 mr-1" />
                                        Compartir
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Help Card */}
                    <Card className="bg-blue-900/20 border-blue-500/30">
                        <CardContent className="p-3">
                            <p className="text-sm text-blue-300 mb-2">
                                💡 <strong>¿No sabes la respuesta?</strong>
                            </p>
                            <p className="text-xs text-slate-400 mb-3">
                                Busca en Twitter, YouTube o pregunta en grupos de Telegram.
                                ¡La comunidad publica las soluciones diarias!
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={searchSolution}
                                className="w-full border-blue-500/50 text-blue-400"
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Buscar en Twitter
                                <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Global Stats */}
                    {challengeData?.globalStats && (
                        <p className="text-center text-xs text-slate-500">
                            🌍 {challengeData.globalStats.solversToday} jugadores han resuelto hoy
                        </p>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
