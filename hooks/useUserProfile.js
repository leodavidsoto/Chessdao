'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { useTonConnect } from '@/hooks/useTonConnect'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar el perfil del usuario
 * Soporta tanto Solana (browser) como TON (Telegram)
 */
export function useUserProfile() {
    // Solana wallet
    const { publicKey, connected: solanaConnected } = useWallet()

    // TON wallet (for Telegram)
    const { isInTelegram, telegramUser } = useTelegramWebApp()
    const { address: tonAddress, isConnected: tonConnected } = useTonConnect()

    // Determine which wallet to use
    const isConnected = isInTelegram ? tonConnected : solanaConnected
    const walletAddress = isInTelegram
        ? tonAddress
        : publicKey?.toString()

    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isNewUser, setIsNewUser] = useState(false)

    // Fetch profile
    const fetchProfile = useCallback(async () => {
        if (!isConnected || !walletAddress) {
            setProfile(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await apiFetch(`/api/user/profile?wallet=${walletAddress}`)
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
    }, [isConnected, walletAddress])

    // Create/update profile
    const saveProfile = useCallback(async (profileData) => {
        if (!isConnected || !walletAddress) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const method = isNewUser ? 'POST' : 'PUT'
            const res = await apiFetch('/api/user/profile', {
                method,
                body: JSON.stringify({
                    walletAddress: walletAddress,
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
    }, [isConnected, walletAddress, isNewUser, fetchProfile])

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
