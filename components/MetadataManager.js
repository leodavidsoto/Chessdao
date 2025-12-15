'use client'

import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import {
    updateV1,
    fetchMetadataFromSeeds,
    mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// CHESS Token Mint (from deployment)
const CHESS_MINT_ADDRESS = 'B5WLyVEUc3wYMH1cn8bwVmRNRCg8JkJQyYjM1PLECDkt'

export default function MetadataManager() {
    const wallet = useWallet()
    const { connection } = useConnection()
    const [loading, setLoading] = useState(false)
    const [signature, setSignature] = useState('')

    const [formData, setFormData] = useState({
        name: 'CHESS',
        symbol: 'CHESS',
        uri: 'https://raw.githubusercontent.com/leodavidsoto/Chessdao/main/metadata.json'
    })

    const updateMetadata = useCallback(async () => {
        if (!wallet.publicKey) {
            toast.error('Conecta tu wallet primero')
            return
        }

        try {
            setLoading(true)

            // Initialize Umi with mpl-token-metadata plugin
            const umi = createUmi(connection.rpcEndpoint)
                .use(walletAdapterIdentity(wallet))
                .use(mplTokenMetadata())

            const mint = fromWeb3JsPublicKey(new PublicKey(CHESS_MINT_ADDRESS))

            toast.info('Cargando metadata existente...')

            // Fetch existing metadata
            const metadata = await fetchMetadataFromSeeds(umi, { mint })
            console.log('Existing metadata:', metadata)

            toast.info('Actualizando... Por favor aprueba en Phantom')

            // Use updateV1 (the modern API)
            await updateV1(umi, {
                mint,
                authority: umi.identity,
                data: {
                    name: formData.name,
                    symbol: formData.symbol,
                    uri: formData.uri,
                    sellerFeeBasisPoints: 0,
                    creators: null,
                },
            }).sendAndConfirm(umi)

            setSignature('Completado')
            toast.success('¡Metadata actualizada exitosamente!')

        } catch (error) {
            console.error('Error updating metadata:', error)
            toast.error('Error al actualizar metadata: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [wallet, connection, formData])

    return (
        <Card className="w-full max-w-md mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-xl text-white">Configurar Token CHESS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm text-slate-400">Mint Address</label>
                    <div className="font-mono text-xs bg-slate-900 p-2 rounded text-slate-300 break-all">
                        {CHESS_MINT_ADDRESS}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-white">Nombre del Token</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-white">Símbolo (Ticker)</label>
                    <Input
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-white">Metadata URI (JSON)</label>
                    <Input
                        value={formData.uri}
                        onChange={(e) => setFormData({ ...formData, uri: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white"
                        placeholder="https://..."
                    />
                    <p className="text-xs text-slate-500">
                        La URL debe apuntar a un archivo JSON con la imagen.
                    </p>
                </div>

                <Button
                    onClick={updateMetadata}
                    disabled={loading || !wallet.publicKey}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Actualizando...
                        </>
                    ) : (
                        'Actualizar Metadata en Blockchain'
                    )}
                </Button>

                {signature && (
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-center">
                        <p className="text-green-400 font-medium">¡Transacción Exitosa!</p>
                        <p className="text-xs text-green-300 mt-1">Revisa tu Phantom Wallet</p>
                    </div>
                )}
                <div className="text-xs text-slate-500 text-center mt-2">
                    Network: {connection.rpcEndpoint.includes('devnet') ? 'Devnet' : 'Mainnet/Other'}
                </div>
            </CardContent>
        </Card>
    )
}
