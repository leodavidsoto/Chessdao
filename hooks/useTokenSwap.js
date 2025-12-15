'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
    TOKEN_CONFIG,
    calculateChessToGame,
    calculateGameToChess,
    validateSwap
} from '@/lib/gameTokens'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar operaciones de swap entre $GAME y CHESS
 */
export function useTokenSwap() {
    const { publicKey, connected } = useWallet()
    const [loading, setLoading] = useState(false)
    const [rates, setRates] = useState(null)
    const [history, setHistory] = useState([])
    const [error, setError] = useState(null)

    // Fetch rates
    const fetchRates = useCallback(async () => {
        try {
            const response = await apiFetch('/api/swap/rates')
            if (response.ok) {
                const data = await response.json()
                setRates(data)
            }
        } catch (err) {
            console.error('Error fetching rates:', err)
        }
    }, [])

    // Fetch swap history
    const fetchHistory = useCallback(async () => {
        if (!connected || !publicKey) return

        try {
            const response = await apiFetch(`/api/swap?wallet=${publicKey.toString()}&limit=10`)
            if (response.ok) {
                const data = await response.json()
                setHistory(data.swaps || [])
            }
        } catch (err) {
            console.error('Error fetching swap history:', err)
        }
    }, [connected, publicKey])

    // Fetch on mount
    useEffect(() => {
        fetchRates()
    }, [fetchRates])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    // Calculate preview
    const calculatePreview = useCallback((fromToken, amount) => {
        if (!amount || amount <= 0) {
            return { grossAmount: 0, fee: 0, netAmount: 0 }
        }

        if (fromToken === 'GAME') {
            return calculateGameToChess(amount)
        } else {
            return calculateChessToGame(amount)
        }
    }, [])

    // Validate swap
    const validate = useCallback((fromToken, amount, balance) => {
        return validateSwap(fromToken, amount, balance)
    }, [])

    // Execute swap
    const swap = useCallback(async (fromToken, toToken, amount) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        setLoading(true)
        setError(null)

        try {
            console.log(`🔄 Initiating swap: ${amount} ${fromToken} → ${toToken}`)

            const response = await apiFetch('/api/swap', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    fromToken,
                    toToken,
                    amount
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Swap failed')
            }

            console.log(`✅ Swap completed: ${data.fromAmount} ${fromToken} → ${data.toAmount} ${toToken}`)

            // Refresh history
            await fetchHistory()

            return {
                success: true,
                swapId: data.swapId,
                fromAmount: data.fromAmount,
                toAmount: data.toAmount,
                fee: data.fee,
                newBalances: data.newBalances
            }

        } catch (err) {
            console.error('Swap error:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey, fetchHistory])

    return {
        loading,
        error,
        rates,
        history,
        config: TOKEN_CONFIG,
        actions: {
            fetchRates,
            fetchHistory,
            calculatePreview,
            validate,
            swap
        }
    }
}
