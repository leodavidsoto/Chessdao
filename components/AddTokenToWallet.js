'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Wallet,
    Copy,
    Check,
    ExternalLink,
    Plus,
    Shield,
    Coins,
    AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

// Token configuration - DEPLOYED ON DEVNET
const TOKEN_INFO = {
    mintAddress: 'DKkVGBw4WqXNNc7uYZqErNsLYgCmRUbKYuVx5WRQ4QTH',
    name: 'CHESS',
    symbol: 'CHESS',
    decimals: 6,
    network: 'devnet', // Change to 'mainnet-beta' for production
    logoUrl: 'https://raw.githubusercontent.com/chessdao/assets/main/chess-token.png'
}

/**
 * Component to help users add CHESS token to their Phantom wallet
 */
export default function AddTokenToWallet({ onClose }) {
    const { connected, wallet } = useWallet()
    const [copied, setCopied] = useState(false)
    const [adding, setAdding] = useState(false)
    const [added, setAdded] = useState(false)

    const isPhantom = wallet?.adapter?.name === 'Phantom'
    const explorerUrl = `https://explorer.solana.com/address/${TOKEN_INFO.mintAddress}?cluster=${TOKEN_INFO.network}`

    // Copy mint address to clipboard
    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(TOKEN_INFO.mintAddress)
            setCopied(true)
            toast.success('Dirección copiada!')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error('Error al copiar')
        }
    }

    // Add token to Phantom wallet programmatically
    const addToPhantom = async () => {
        if (!window.solana || !window.solana.isPhantom) {
            toast.error('Phantom wallet no detectada')
            return
        }

        setAdding(true)

        try {
            await window.solana.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'SPL',
                    options: {
                        address: TOKEN_INFO.mintAddress,
                    },
                },
            })

            setAdded(true)
            toast.success('¡Token CHESS añadido a Phantom!')

        } catch (error) {
            if (error.code === 4001) {
                toast.error('Solicitud rechazada')
            } else {
                toast.error('Error al añadir token')
                console.error('Add token error:', error)
            }
        } finally {
            setAdding(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 max-w-md w-full shadow-2xl">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl text-white flex items-center">
                                <Wallet className="h-6 w-6 mr-2 text-purple-400" />
                                Añadir Token a Wallet
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                                Añade CHESS token a tu Phantom wallet
                            </CardDescription>
                        </div>
                        {onClose && (
                            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
                                ✕
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Token Info Card */}
                    <Card className="bg-purple-500/10 border-purple-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                    <Coins className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-white">{TOKEN_INFO.name}</span>
                                        <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                                            {TOKEN_INFO.symbol}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Token oficial de ChessDAO
                                    </p>
                                </div>
                            </div>

                            {/* Mint Address */}
                            <div className="mt-4 bg-slate-900/50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-400 mb-1">Mint Address</p>
                                        <p className="text-sm text-white font-mono truncate">
                                            {TOKEN_INFO.mintAddress}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyAddress}
                                        className="ml-2 text-slate-400 hover:text-white"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-400" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add to Phantom Button */}
                    {isPhantom && !added && (
                        <Button
                            onClick={addToPhantom}
                            disabled={adding || !TOKEN_INFO.mintAddress.startsWith('CHESS')}
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold"
                        >
                            {adding ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                                    Añadiendo...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5 mr-2" />
                                    Añadir a Phantom
                                </>
                            )}
                        </Button>
                    )}

                    {/* Success State */}
                    {added && (
                        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 flex items-center gap-3">
                            <Check className="h-6 w-6 text-green-400" />
                            <div>
                                <p className="text-green-400 font-semibold">¡Token añadido!</p>
                                <p className="text-sm text-slate-400">
                                    CHESS ahora aparece en tu Phantom wallet
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Manual Instructions */}
                    <div className="bg-slate-700/30 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-blue-400" />
                            Añadir Manualmente
                        </h4>
                        <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                            <li>Abre Phantom Wallet</li>
                            <li>Ve a la pestaña de tokens (icono de monedas)</li>
                            <li>Click en "Manage Token List"</li>
                            <li>Click en el botón "+"</li>
                            <li>Pega la dirección del mint copiada arriba</li>
                            <li>Confirma para añadir</li>
                        </ol>
                    </div>

                    {/* Verification Links */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                            asChild
                        >
                            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver en Explorer
                            </a>
                        </Button>
                    </div>

                    {/* Network Info */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <AlertCircle className="h-3 w-3" />
                        <span>
                            Red: {TOKEN_INFO.network === 'devnet' ? 'Devnet (Pruebas)' : 'Mainnet'}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
