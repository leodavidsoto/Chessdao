'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTelegramWebApp } from './useTelegramWebApp'

/**
 * TON Connect hook for Telegram Mini App
 * Optimized for Telegram WebView environment with proper redirect handling
 */
export function useTonConnect() {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [address, setAddress] = useState(null)
    const [balance, setBalance] = useState(null)
    const [error, setError] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [connectionTimedOut, setConnectionTimedOut] = useState(false)
    const tonConnectRef = useRef(null)
    const connectionTimeoutRef = useRef(null)
    const { isInTelegram, telegramUser } = useTelegramWebApp()

    // Connection timeout in ms (15 seconds)
    const CONNECTION_TIMEOUT = 15000

    // Initialize TON Connect
    useEffect(() => {
        if (typeof window === 'undefined') return

        const init = async () => {
            try {
                // Dynamic import to avoid SSR issues
                const TonConnectModule = await import('@tonconnect/ui')
                const TonConnectUI = TonConnectModule.TonConnectUI

                console.log('🔷 Creating TonConnectUI instance...', { isInTelegram })

                // Configure for Telegram Mini App environment
                const config = {
                    manifestUrl: 'https://chessdao-production.up.railway.app/tonconnect-manifest.json',
                    // Enable connection restoration for better UX
                    restoreConnection: true
                }

                // Add Telegram Mini App specific configuration
                if (isInTelegram) {
                    config.actionsConfiguration = {
                        // Return URL for Telegram Mini App - required for wallet apps to redirect back
                        twaReturnUrl: 'https://t.me/ChessDAObot/app'
                    }
                    console.log('🔷 Telegram Mini App detected, using twaReturnUrl')
                }

                const tonConnect = new TonConnectUI(config)

                // Subscribe to status changes
                tonConnect.onStatusChange((wallet) => {
                    console.log('🔷 Wallet status changed:', wallet)
                    if (wallet) {
                        setIsConnected(true)
                        setIsConnecting(false)
                        setAddress(wallet.account?.address || null)
                        // Store in localStorage for persistence
                        localStorage.setItem('ton_wallet', JSON.stringify({
                            address: wallet.account?.address,
                            connected: true
                        }))
                    } else {
                        setIsConnected(false)
                        setAddress(null)
                        setBalance(null)
                        localStorage.removeItem('ton_wallet')
                    }
                })

                // Check if already connected
                if (tonConnect.wallet) {
                    setIsConnected(true)
                    setAddress(tonConnect.wallet.account?.address || null)
                } else {
                    // Check localStorage fallback
                    const stored = localStorage.getItem('ton_wallet')
                    if (stored) {
                        try {
                            const data = JSON.parse(stored)
                            if (data.connected && data.address) {
                                setAddress(data.address)
                                // Don't set connected here - wait for actual wallet check
                            }
                        } catch (e) {
                            localStorage.removeItem('ton_wallet')
                        }
                    }
                }

                tonConnectRef.current = tonConnect
                setIsInitialized(true)
                setError(null)
                console.log('🔷 TON Connect initialized successfully')

            } catch (err) {
                console.error('❌ TON Connect init error:', err)
                setError(`Error al inicializar: ${err.message}`)
                setIsInitialized(true) // Mark as initialized so UI can show error
            }
        }

        init()

        return () => {
            // Cleanup
            tonConnectRef.current = null
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current)
            }
        }
    }, [])

    // Fetch balance when address changes
    useEffect(() => {
        if (!address) return

        const fetchBalance = async () => {
            try {
                const res = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.ok && data.result) {
                        setBalance(parseInt(data.result) / 1e9)
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch TON balance:', err)
            }
        }

        fetchBalance()
    }, [address])

    // Connect to wallet
    const connect = useCallback(async () => {
        const tc = tonConnectRef.current

        if (!tc) {
            setError('TON Connect no está inicializado. Recarga la página.')
            return
        }

        // Clear any previous timeout
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
        }

        setIsConnecting(true)
        setConnectionTimedOut(false)
        setError(null)

        // Set connection timeout to prevent infinite loading
        connectionTimeoutRef.current = setTimeout(() => {
            if (!isConnected) {
                console.log('🔷 Connection timeout - closing modal')
                setConnectionTimedOut(true)
                setIsConnecting(false)
                setError('Tiempo de conexión agotado. Intenta de nuevo.')
                try {
                    tc.closeModal()
                } catch (e) {
                    // Modal might already be closed
                }
            }
        }, CONNECTION_TIMEOUT)

        try {
            console.log('🔷 Opening TON Connect modal...', { isInTelegram })
            await tc.openModal()
        } catch (err) {
            console.error('❌ Connect error:', err)
            setError(`Error de conexión: ${err.message}`)
            setIsConnecting(false)
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current)
            }
        }
    }, [isConnected, isInTelegram])

    // Disconnect
    const disconnect = useCallback(async () => {
        const tc = tonConnectRef.current
        if (!tc) return

        try {
            await tc.disconnect()
        } catch (err) {
            console.error('Disconnect error:', err)
        }

        setIsConnected(false)
        setAddress(null)
        setBalance(null)
        localStorage.removeItem('ton_wallet')
    }, [])

    // Get formatted address
    const getFormattedAddress = useCallback(() => {
        if (!address) return null
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }, [address])

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        if (!address) return

        try {
            const res = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`)
            if (res.ok) {
                const data = await res.json()
                if (data.ok && data.result) {
                    setBalance(parseInt(data.result) / 1e9)
                }
            }
        } catch (err) {
            console.warn('Failed to refresh balance:', err)
        }
    }, [address])

    // Retry connection (resets timeout state)
    const retry = useCallback(() => {
        setConnectionTimedOut(false)
        setError(null)
        connect()
    }, [connect])

    return {
        isConnected,
        isConnecting,
        isInitialized,
        connectionTimedOut,
        address,
        balance,
        error,
        isInTelegram,
        telegramUser,
        actions: {
            connect,
            disconnect,
            refreshBalance,
            getFormattedAddress,
            retry
        }
    }
}
