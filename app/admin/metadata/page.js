'use client'

import MetadataManager from '@/components/MetadataManager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function TokenMetadataPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
            <Link
                href="/"
                className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver
            </Link>

            <div className="w-full max-w-2xl text-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
                    Gestión del Token CHESS
                </h1>
                <p className="text-slate-400">
                    Utiliza esta herramienta para configurar cómo se ve tu token en Phantom.
                    Necesitarás firmar la transacción ya que eres el dueño del token.
                </p>
            </div>

            <div className="mb-6">
                <WalletMultiButton />
            </div>

            <MetadataManager />
        </div>
    )
}
