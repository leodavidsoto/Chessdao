'use client'

import { useMemo, useCallback, useEffect, useState } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter
} from '@solana/wallet-adapter-wallets'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'
import { createDefaultAddressSelector, createDefaultAuthorizationResultCache, SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile'

import '@solana/wallet-adapter-react-ui/styles.css'

export function SolanaWalletProvider({ children }) {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect if running on mobile/Android WebView
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    setIsMobile(mobile)
  }, [])

  const wallets = useMemo(() => {
    const walletList = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ]

    // Add Mobile Wallet Adapter for Android/mobile environments
    if (isMobile) {
      walletList.unshift(
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          appIdentity: {
            name: 'ChessDAO',
            uri: 'https://chessdao.app',
            icon: '/chessdao-logo.png',
          },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          cluster: network,
        })
      )
    }

    return walletList
  }, [isMobile, network])

  const onError = useCallback((error) => {
    console.error('Wallet error:', error)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onError}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}