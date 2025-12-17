'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/config'

/**
 * Hook for Profit Per Hour passive income system
 */
export function usePassiveIncome(walletAddress) {
    const [pphData, setPphData] = useState(null)
    const [upgradeData, setUpgradeData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [claiming, setClaiming] = useState(false)
    const [upgrading, setUpgrading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch PPH status
    const fetchStatus = useCallback(async () => {
        if (!walletAddress) return

        setLoading(true)
        try {
            const [pphRes, upgradeRes] = await Promise.all([
                apiFetch(`/api/user/pph?wallet=${walletAddress}`),
                apiFetch(`/api/user/upgrade?wallet=${walletAddress}`)
            ])

            const pph = await pphRes.json()
            const upgrade = await upgradeRes.json()

            if (pphRes.ok) setPphData(pph)
            if (upgradeRes.ok) setUpgradeData(upgrade)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [walletAddress])

    // Claim accumulated income
    const claimIncome = useCallback(async () => {
        if (!walletAddress || claiming) return null

        setClaiming(true)
        setError(null)

        try {
            const response = await apiFetch('/api/user/pph', {
                method: 'POST',
                body: JSON.stringify({ walletAddress })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to claim')
            }

            // Refresh status
            await fetchStatus()

            return data
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setClaiming(false)
        }
    }, [walletAddress, claiming, fetchStatus])

    // Purchase upgrade
    const purchaseUpgrade = useCallback(async () => {
        if (!walletAddress || upgrading) return null

        setUpgrading(true)
        setError(null)

        try {
            const response = await apiFetch('/api/user/upgrade', {
                method: 'POST',
                body: JSON.stringify({ walletAddress })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upgrade')
            }

            // Refresh status
            await fetchStatus()

            return data
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setUpgrading(false)
        }
    }, [walletAddress, upgrading, fetchStatus])

    // Auto-refresh every minute
    useEffect(() => {
        fetchStatus()

        const interval = setInterval(fetchStatus, 60000) // Every minute
        return () => clearInterval(interval)
    }, [fetchStatus])

    return {
        pphData,
        upgradeData,
        loading,
        claiming,
        upgrading,
        error,
        actions: {
            refresh: fetchStatus,
            claim: claimIncome,
            upgrade: purchaseUpgrade
        }
    }
}
