'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { TOKEN_CONFIG, formatGameAmount } from '@/lib/gameTokens'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar balance de $GAME tokens
 */
export function useGameTokens() {
    const { publicKey, connected } = useWallet()
    const [gameBalance, setGameBalance] = useState(0)
    const [stats, setStats] = useState({
        totalEarned: 0,
        totalSpent: 0,
        totalSwappedIn: 0,
        totalSwappedOut: 0
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [lastUpdate, setLastUpdate] = useState(null)

    // Fetch balance from API
    const fetchBalance = useCallback(async () => {
        if (!connected || !publicKey) {
            setGameBalance(0)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const walletAddress = publicKey.toString()
            const response = await apiFetch(`/api/game-balance?wallet=${walletAddress}`)

            if (!response.ok) {
                throw new Error('Failed to fetch $GAME balance')
            }

            const data = await response.json()
            setGameBalance(data.gameBalance || 0)
            setStats(data.stats || {
                totalEarned: 0,
                totalSpent: 0,
                totalSwappedIn: 0,
                totalSwappedOut: 0
            })
            setLastUpdate(new Date())

            console.log(`🎮 $GAME Balance: ${data.gameBalance}`)

        } catch (err) {
            console.error('Error fetching $GAME balance:', err)
            setError(err.message)
            // Fallback to demo balance
            setGameBalance(TOKEN_CONFIG.INITIAL_GAME_BALANCE)
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    // Fetch on mount and when wallet changes
    useEffect(() => {
        fetchBalance()
    }, [fetchBalance])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!connected) return

        const interval = setInterval(fetchBalance, 30000)
        return () => clearInterval(interval)
    }, [connected, fetchBalance])

    // Add tokens
    const addTokens = useCallback(async (amount, type = 'other') => {
        if (!publicKey) return { success: false, error: 'Wallet not connected' }

        try {
            const response = await apiFetch('/api/game-balance', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount,
                    operation: 'add',
                    type
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setGameBalance(data.newBalance)
                return { success: true, newBalance: data.newBalance }
            } else {
                throw new Error(data.error || 'Failed to add tokens')
            }
        } catch (err) {
            console.error('Error adding $GAME:', err)
            return { success: false, error: err.message }
        }
    }, [publicKey])

    // Deduct tokens
    const deductTokens = useCallback(async (amount, type = 'other') => {
        if (!publicKey) return { success: false, error: 'Wallet not connected' }

        if (amount > gameBalance) {
            return { success: false, error: 'Insufficient balance' }
        }

        try {
            const response = await apiFetch('/api/game-balance', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount,
                    operation: 'subtract',
                    type
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setGameBalance(data.newBalance)
                return { success: true, newBalance: data.newBalance }
            } else {
                throw new Error(data.error || 'Failed to deduct tokens')
            }
        } catch (err) {
            console.error('Error deducting $GAME:', err)
            return { success: false, error: err.message }
        }
    }, [publicKey, gameBalance])

    // Check if user can afford amount
    const canAfford = useCallback((amount) => {
        return gameBalance >= amount
    }, [gameBalance])

    return {
        gameBalance,
        stats,
        loading,
        error,
        lastUpdate,
        actions: {
            refreshBalance: fetchBalance,
            addTokens,
            deductTokens,
            canAfford,
            formatAmount: formatGameAmount
        }
    }
}
