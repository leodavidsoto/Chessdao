'use client'

import './globals.css'
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient())
  
  return (
    <html lang="en">
      <head>
        <title>DAO Chess - Decentralized Chess with Token Rewards</title>
        <meta name="description" content="Play chess, earn tokens, vote on community moves in the ultimate decentralized chess experience" />
      </head>
      <body className="min-h-screen bg-slate-900">
        <QueryClientProvider client={queryClient}>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}