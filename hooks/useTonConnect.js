'use client'

import { useState, useEffect, useCallback } from 'react'
import { TonConnectUI, CHAIN } from '@tonconnect/ui-react'
import { useTelegramWebApp } from './useTelegramWebApp'

// TON Connect manifest - describes the app to wallets
const MANIFEST_URL = 'https://chessdao-production.up.railway.app/tonconnect-manifest.json'

/**
 * Hook for TON Connect integration
 * Used in Telegram Mini App for native TON wallet connection
 */
export function useTonConnect() {
    const [tonConnectUI, setTonConnectUI] = useState(null)
    const [wallet, setWallet] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [address, setAddress] = useState(null)
    const [balance, setBalance] = useState(null)
    const [error, setError] = useState(null)
    const { isInTelegram, telegramUser } = useTelegramWebApp()

    // Initialize TON Connect
    useEffect(() => {
        if (typeof window === 'undefined') return

        const initTonConnect = async () => {
            try {
                const tonConnect = new TonConnectUI({
                    manifestUrl: MANIFEST_URL,
                    // Use Telegram-friendly wallets first
                    walletsListConfiguration: {
                        includeWallets: ['tonkeeper', 'mytonwallet', 'openmask']
                    }
                })

                // Listen for connection changes
                tonConnect.onStatusChange((currentWallet) => {
                    if (currentWallet) {
                        console.log('🔷 TON Wallet connected:', currentWallet)
                        setWallet(currentWallet)
                        setIsConnected(true)
                        setAddress(currentWallet.account?.address || null)
                    } else {
                        console.log('🔷 TON Wallet disconnected')
                        setWallet(null)
                        setIsConnected(false)
                        setAddress(null)
                        setBalance(null)
                    }
                })

                // Check if already connected
                if (tonConnect.connected) {
                    const currentWallet = tonConnect.wallet
                    setWallet(currentWallet)
                    setIsConnected(true)
                    setAddress(currentWallet?.account?.address || null)
                }

                setTonConnectUI(tonConnect)
            } catch (err) {
                console.error('Failed to initialize TON Connect:', err)
                setError(err.message)
            }
        }

        initTonConnect()

        return () => {
            // Cleanup if needed
        }
    }, [])

    // Fetch TON balance
    const fetchBalance = useCallback(async () => {
        if (!address) return

        try {
            // Use TON API to get balance
            const response = await fetch(`https://tonapi.io/v2/accounts/${address}`)
            if (response.ok) {
                const data = await response.json()
                setBalance(data.balance / 1e9) // Convert from nanoTON to TON
            }
        } catch (err) {
            console.error('Failed to fetch TON balance:', err)
        }
    }, [address])

    useEffect(() => {
        if (address) {
            fetchBalance()
        }
    }, [address, fetchBalance])

    // Connect wallet
    const connect = useCallback(async () => {
        if (!tonConnectUI) return

        setIsConnecting(true)
        setError(null)

        try {
            await tonConnectUI.openModal()
        } catch (err) {
            console.error('TON Connect error:', err)
            setError(err.message)
        } finally {
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
        } catch (err) {
            console.error('TON Disconnect error:', err)
        }
    }, [tonConnectUI])

    // Send TON transaction
    const sendTransaction = useCallback(async (toAddress, amount, message = '') => {
        if (!tonConnectUI || !isConnected) {
            throw new Error('Wallet not connected')
        }

        try {
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                messages: [
                    {
                        address: toAddress,
                        amount: String(Math.floor(amount * 1e9)), // Convert TON to nanoTON
                        payload: message ? btoa(message) : undefined
                    }
                ]
            }

            const result = await tonConnectUI.sendTransaction(transaction)
            console.log('🔷 TON Transaction sent:', result)

            return {
                success: true,
                boc: result.boc
            }
        } catch (err) {
            console.error('TON Transaction error:', err)
            return {
                success: false,
                error: err.message
            }
        }
    }, [tonConnectUI, isConnected])

    // Get formatted address
    const getFormattedAddress = useCallback(() => {
        if (!address) return null
        // TON addresses are long, show shortened version
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }, [address])

    return {
        tonConnectUI,
        wallet,
        isConnected,
        isConnecting,
        address,
        balance,
        error,
        isInTelegram,
        telegramUser,
        actions: {
            connect,
            disconnect,
            sendTransaction,
            refreshBalance: fetchBalance,
            getFormattedAddress
        }
    }
}
