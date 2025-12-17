'use client'

import './globals.css'
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useState, useEffect } from 'react'

// Create query client outside of component to avoid recreation on each render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>DAO Chess - Decentralized Chess with Token Rewards</title>
        <meta name="description" content="Play chess, earn tokens, vote on community moves in the ultimate decentralized chess experience" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="ChessDAO" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ChessDAO" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#a855f7" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Icons */}
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-slate-900" suppressHydrationWarning>
        {mounted ? (
          <QueryClientProvider client={queryClient}>
            <SolanaWalletProvider>
              {children}
            </SolanaWalletProvider>
          </QueryClientProvider>
        ) : (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 font-mono tracking-wider">Initializing ChessDAO...</p>
            </div>
          </div>
        )}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}