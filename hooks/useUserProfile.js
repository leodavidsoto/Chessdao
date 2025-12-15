'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar el perfil del usuario
 */
export function useUserProfile() {
    const { publicKey, connected } = useWallet()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isNewUser, setIsNewUser] = useState(false)

    // Fetch profile
    const fetchProfile = useCallback(async () => {
        if (!connected || !publicKey) {
            setProfile(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await apiFetch(`/api/user/profile?wallet=${publicKey.toString()}`)
            const data = await res.json()

            if (res.ok) {
                setProfile(data)
                setIsNewUser(data.isNewUser)
            } else {
                setError(data.error)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    // Create/update profile
    const saveProfile = useCallback(async (profileData) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const method = isNewUser ? 'POST' : 'PUT'
            const res = await apiFetch('/api/user/profile', {
                method,
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    ...profileData
                })
            })

            const data = await res.json()

            if (res.ok) {
                await fetchProfile()
                return { success: true, data }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            console.error('Error saving profile:', err)
            return { success: false, error: err.message }
        }
    }, [connected, publicKey, isNewUser, fetchProfile])

    // Update settings
    const updateSettings = useCallback(async (settings) => {
        return saveProfile({ settings })
    }, [saveProfile])

    // Update status
    const updateStatus = useCallback(async (status) => {
        return saveProfile({ status })
    }, [saveProfile])

    // Fetch on mount and wallet change
    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    return {
        profile,
        loading,
        error,
        isNewUser,
        actions: {
            refreshProfile: fetchProfile,
            saveProfile,
            updateSettings,
            updateStatus
        }
    }
}
