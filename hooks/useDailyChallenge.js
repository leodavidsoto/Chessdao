'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/config'

/**
 * Hook for Daily Combo/Cipher challenges
 */
export function useDailyChallenge(walletAddress) {
    const [challengeData, setChallengeData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Fetch challenge status
    const fetchChallenge = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const url = walletAddress
                ? `/api/daily-combo?wallet=${walletAddress}`
                : '/api/daily-combo'

            const response = await apiFetch(url)
            const data = await response.json()

            if (data.success) {
                setChallengeData(data)
            } else {
                setError(data.error)
            }
        } catch (err) {
            console.error('Error fetching daily challenge:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [walletAddress])

    // Submit solution
    const submitSolution = useCallback(async (type, solution) => {
        if (!walletAddress || submitting) return null

        setSubmitting(true)
        setError(null)

        try {
            const response = await apiFetch('/api/daily-combo', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress,
                    type,
                    solution
                })
            })

            const data = await response.json()

            if (data.success && data.correct) {
                // Refresh data after solving
                await fetchChallenge()
            }

            return data
        } catch (err) {
            console.error('Error submitting solution:', err)
            setError(err.message)
            return null
        } finally {
            setSubmitting(false)
        }
    }, [walletAddress, submitting, fetchChallenge])

    // Load on mount
    useEffect(() => {
        fetchChallenge()
    }, [fetchChallenge])

    return {
        challengeData,
        loading,
        submitting,
        error,
        actions: {
            refresh: fetchChallenge,
            submitCombo: (solution) => submitSolution('combo', solution),
            submitCipher: (solution) => submitSolution('cipher', solution)
        }
    }
}
