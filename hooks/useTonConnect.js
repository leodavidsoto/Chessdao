'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTelegramWebApp } from './useTelegramWebApp'

// TON Connect manifest URL
const MANIFEST_URL = 'https://chessdao-production.up.railway.app/tonconnect-manifest.json'

/**
 * Hook for TON Connect integration in Telegram Mini App
 * Uses the TonConnect SDK properly for Telegram WebView
 */
export function useTonConnect() {
    const [tonConnectUI, setTonConnectUI] = useState(null)
    const [wallet, setWallet] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [address, setAddress] = useState(null)
    const [balance, setBalance] = useState(null)
    const [error, setError] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const initRef = useRef(false)
    const { isInTelegram, telegramUser } = useTelegramWebApp()

    // Initialize TON Connect UI
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (initRef.current) return
        initRef.current = true

        const initTonConnect = async () => {
            try {
                // Dynamically import to avoid SSR issues
                const { TonConnectUI } = await import('@tonconnect/ui')

                console.log('🔷 Initializing TON Connect...')

                const tonConnect = new TonConnectUI({
                    manifestUrl: MANIFEST_URL,
                    buttonRootId: 'ton-connect-button', // Optional DOM element for button
                })

                // Listen for connection status changes
                const unsubscribe = tonConnect.onStatusChange((currentWallet) => {
                    console.log('🔷 TON Status changed:', currentWallet)
                    if (currentWallet) {
                        setWallet(currentWallet)
                        setIsConnected(true)
                        setIsConnecting(false)
                        setAddress(currentWallet.account?.address || null)
                    } else {
                        setWallet(null)
                        setIsConnected(false)
                        setAddress(null)
                        setBalance(null)
                    }
                })

                // Check if already connected from previous session
                if (tonConnect.connected && tonConnect.wallet) {
                    console.log('🔷 Already connected to TON wallet')
                    setWallet(tonConnect.wallet)
                    setIsConnected(true)
                    setAddress(tonConnect.wallet.account?.address || null)
                }

                setTonConnectUI(tonConnect)
                setIsInitialized(true)
                console.log('🔷 TON Connect initialized successfully')

            } catch (err) {
                console.error('❌ Failed to initialize TON Connect:', err)
                setError(err.message)
                setIsInitialized(true) // Mark as initialized even on error
            }
        }

        initTonConnect()
    }, [])

    // Fetch TON balance when address changes
    useEffect(() => {
        if (!address) return

        const fetchBalance = async () => {
            try {
                // Use TON Center API (more reliable)
                const response = await fetch(
                    `https://toncenter.com/api/v2/getAddressBalance?address=${address}`
                )
                if (response.ok) {
                    const data = await response.json()
                    if (data.ok && data.result) {
                        setBalance(parseInt(data.result) / 1e9) // Convert from nanoTON
                    }
                }
            } catch (err) {
                console.error('Failed to fetch TON balance:', err)
                // Fallback - try TON API
                try {
                    const res = await fetch(`https://tonapi.io/v2/accounts/${address}`)
                    if (res.ok) {
                        const data = await res.json()
                        setBalance(data.balance / 1e9)
                    }
                } catch (e) {
                    console.error('Fallback balance fetch also failed:', e)
                }
            }
        }

        fetchBalance()
    }, [address])

    // Connect wallet - opens the TON Connect modal
    const connect = useCallback(async () => {
        if (!tonConnectUI) {
            console.error('TON Connect not initialized')
            setError('TON Connect no está listo. Intenta de nuevo.')
            return
        }

        setIsConnecting(true)
        setError(null)

        try {
            console.log('🔷 Opening TON Connect modal...')
            // This opens the wallet selection modal
            await tonConnectUI.openModal()
            console.log('🔷 Modal opened')
        } catch (err) {
            console.error('❌ TON Connect error:', err)
            setError(err.message || 'Error al conectar wallet')
            setIsConnecting(false)
        }
    }, [tonConnectUI])

    // Disconnect wallet
    const disconnect = useCallback(async () => {
        if (!tonConnectUI) return

        try {
            await tonConnectUI.disconnect()
            setWallet(null)
            setIsConnected(false)
            setAddress(null)
            setBalance(null)
            console.log('🔷 Disconnected from TON wallet')
        } catch (err) {
            console.error('TON Disconnect error:', err)
        }
    }, [tonConnectUI])

    // Send TON transaction
    const sendTransaction = useCallback(async (toAddress, amount, comment = '') => {
        if (!tonConnectUI || !isConnected) {
            throw new Error('Wallet not connected')
        }

        try {
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600,
                messages: [
                    {
                        address: toAddress,
                        amount: String(Math.floor(amount * 1e9)),
                        payload: comment || undefined
                    }
                ]
            }

            const result = await tonConnectUI.sendTransaction(transaction)
            console.log('🔷 TON Transaction sent:', result)

            return { success: true, boc: result.boc }
        } catch (err) {
            console.error('TON Transaction error:', err)
            return { success: false, error: err.message }
        }
    }, [tonConnectUI, isConnected])

    // Refresh balance manually
    const refreshBalance = useCallback(async () => {
        if (!address) return

        try {
            const response = await fetch(
                `https://toncenter.com/api/v2/getAddressBalance?address=${address}`
            )
            if (response.ok) {
                const data = await response.json()
                if (data.ok && data.result) {
                    setBalance(parseInt(data.result) / 1e9)
                }
            }
        } catch (err) {
            console.error('Failed to refresh balance:', err)
        }
    }, [address])

    // Get formatted short address
    const getFormattedAddress = useCallback(() => {
        if (!address) return null
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }, [address])

    return {
        tonConnectUI,
        wallet,
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
            sendTransaction,
            refreshBalance,
            getFormattedAddress
        }
    }
}
