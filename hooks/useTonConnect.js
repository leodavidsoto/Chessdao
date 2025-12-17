'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTelegramWebApp } from './useTelegramWebApp'

/**
 * Simplified TON Connect hook for Telegram Mini App
 * Uses TonConnect button element directly instead of complex UI
 */
export function useTonConnect() {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [address, setAddress] = useState(null)
    const [balance, setBalance] = useState(null)
    const [error, setError] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const tonConnectRef = useRef(null)
    const { isInTelegram, telegramUser } = useTelegramWebApp()

    // Initialize TON Connect
    useEffect(() => {
        if (typeof window === 'undefined') return

        const init = async () => {
            try {
                // Dynamic import to avoid SSR issues
                const TonConnectModule = await import('@tonconnect/ui')
                const TonConnectUI = TonConnectModule.TonConnectUI

                console.log('🔷 Creating TonConnectUI instance...')

                const tonConnect = new TonConnectUI({
                    manifestUrl: 'https://chessdao-production.up.railway.app/tonconnect-manifest.json'
                })

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

        setIsConnecting(true)
        setError(null)

        try {
            console.log('🔷 Opening TON Connect modal...')
            await tc.openModal()
        } catch (err) {
            console.error('❌ Connect error:', err)
            setError(`Error de conexión: ${err.message}`)
            setIsConnecting(false)
        }
    }, [])

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

    return {
        isConnected,
        isConnecting,
        isInitialized,
        address,
        balance,
        error,
        isInTelegram,
        telegramUser,
        actions: {
            connect,
            disconnect,
            refreshBalance,
            getFormattedAddress
        }
    }
}
