'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider'

// Dynamic import to avoid SSR issues
const InviteGame = dynamic(() => import('@/components/InviteGame'), { ssr: false })

function LoadingSpinner() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at center, #0B1221 0%, #020617 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F8FAFC',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(45, 226, 230, 0.2)',
                borderTopColor: '#2DE2E6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontFamily: 'Orbitron, sans-serif' }}>Cargando partida...</p>
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default function PlayClient({ code }) {
    const handleBack = () => {
        window.location.href = '/'
    }

    return (
        <SolanaWalletProvider>
            <Suspense fallback={<LoadingSpinner />}>
                <InviteGame
                    inviteCode={code}
                    onBack={handleBack}
                />
            </Suspense>
        </SolanaWalletProvider>
    )
}
