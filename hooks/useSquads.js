'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/config'

/**
 * Hook for managing Squads
 */
export function useSquads(walletAddress) {
    const [mySquad, setMySquad] = useState(null)
    const [myMembership, setMyMembership] = useState(null)
    const [leaderboard, setLeaderboard] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch squad data
    const fetchSquadData = useCallback(async () => {
        if (!walletAddress) return

        setLoading(true)
        setError(null)

        try {
            // Get user's squad and leaderboard
            const [myRes, leaderRes] = await Promise.all([
                apiFetch(`/api/squads?wallet=${walletAddress}`),
                apiFetch(`/api/squads?limit=20`)
            ])

            const myData = await myRes.json()
            const leaderData = await leaderRes.json()

            if (myData.success) {
                setMySquad(myData.mySquad || null)
                setMyMembership(myData.myMembership || null)
            }

            if (leaderData.success) {
                setLeaderboard(leaderData.squads || [])
            }
        } catch (err) {
            console.error('Error fetching squads:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [walletAddress])

    // Create a new squad
    const createSquad = useCallback(async (squadName, description, avatar) => {
        if (!walletAddress) return null

        try {
            const response = await apiFetch('/api/squads', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'create',
                    walletAddress,
                    squadName,
                    description,
                    avatar
                })
            })

            const data = await response.json()

            if (data.success) {
                await fetchSquadData()
                return data
            } else {
                setError(data.error)
                return null
            }
        } catch (err) {
            setError(err.message)
            return null
        }
    }, [walletAddress, fetchSquadData])

    // Join a squad
    const joinSquad = useCallback(async (squadId) => {
        if (!walletAddress) return null

        try {
            const response = await apiFetch('/api/squads', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'join',
                    walletAddress,
                    squadId
                })
            })

            const data = await response.json()

            if (data.success) {
                await fetchSquadData()
                return data
            } else {
                setError(data.error)
                return null
            }
        } catch (err) {
            setError(err.message)
            return null
        }
    }, [walletAddress, fetchSquadData])

    // Leave current squad
    const leaveSquad = useCallback(async () => {
        if (!walletAddress) return null

        try {
            const response = await apiFetch('/api/squads', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'leave',
                    walletAddress
                })
            })

            const data = await response.json()

            if (data.success) {
                setMySquad(null)
                setMyMembership(null)
                await fetchSquadData()
                return data
            } else {
                setError(data.error)
                return null
            }
        } catch (err) {
            setError(err.message)
            return null
        }
    }, [walletAddress, fetchSquadData])

    // Load on mount
    useEffect(() => {
        fetchSquadData()
    }, [fetchSquadData])

    return {
        mySquad,
        myMembership,
        leaderboard,
        loading,
        error,
        isInSquad: !!mySquad,
        actions: {
            refresh: fetchSquadData,
            create: createSquad,
            join: joinSquad,
            leave: leaveSquad
        }
    }
}
