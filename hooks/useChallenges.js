'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar desafíos
 */
export function useChallenges() {
    const { publicKey, connected } = useWallet()
    const [incoming, setIncoming] = useState([])
    const [outgoing, setOutgoing] = useState([])
    const [completed, setCompleted] = useState([])
    const [counts, setCounts] = useState({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch challenges
    const fetchChallenges = useCallback(async () => {
        if (!connected || !publicKey) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await apiFetch(`/api/user/challenges?wallet=${publicKey.toString()}`)
            const data = await res.json()

            if (res.ok) {
                setIncoming(data.incoming || [])
                setOutgoing(data.outgoing || [])
                setCompleted(data.completed || [])
                setCounts(data.counts || {})
            } else {
                setError(data.error)
            }
        } catch (err) {
            console.error('Error fetching challenges:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    // Send challenge
    const sendChallenge = useCallback(async (challengedWallet, options = {}) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/challenges', {
                method: 'POST',
                body: JSON.stringify({
                    challenger: publicKey.toString(),
                    challenged: challengedWallet,
                    gameType: options.gameType || 'pvp',
                    timeControl: options.timeControl || '10+0',
                    betAmount: options.betAmount || 0,
                    color: options.color || 'random',
                    message: options.message || ''
                })
            })

            const data = await res.json()

            if (res.ok) {
                await fetchChallenges()
                return { success: true, data }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey, fetchChallenges])

    // Respond to challenge
    const respondToChallenge = useCallback(async (challengeId, action) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/challenges', {
                method: 'PUT',
                body: JSON.stringify({
                    challengeId,
                    walletAddress: publicKey.toString(),
                    action
                })
            })

            const data = await res.json()

            if (res.ok) {
                await fetchChallenges()
                return { success: true, data }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey, fetchChallenges])

    // Fetch on mount
    useEffect(() => {
        fetchChallenges()
    }, [fetchChallenges])

    return {
        incoming,
        outgoing,
        completed,
        counts,
        hasPendingChallenges: incoming.length > 0,
        loading,
        error,
        actions: {
            refresh: fetchChallenges,
            sendChallenge,
            acceptChallenge: (id) => respondToChallenge(id, 'accept'),
            declineChallenge: (id) => respondToChallenge(id, 'decline')
        }
    }
}
