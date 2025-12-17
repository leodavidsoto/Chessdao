'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/config'

/**
 * Hook for managing referral system
 * Handles getting referral code, stats, and applying codes
 */
export function useReferral(walletAddress) {
    const [referralData, setReferralData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch referral data
    const fetchReferralData = useCallback(async () => {
        if (!walletAddress) return

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch(`/api/user/referral?wallet=${walletAddress}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch referral data')
            }

            setReferralData(data)
        } catch (err) {
            console.error('Referral fetch error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [walletAddress])

    // Apply referral code (for new users)
    const applyReferralCode = useCallback(async (referralCode, isPremium, username) => {
        if (!walletAddress || !referralCode) {
            return { success: false, error: 'Missing wallet or referral code' }
        }

        try {
            const response = await apiFetch('/api/user/referral', {
                method: 'POST',
                body: JSON.stringify({
                    inviteeWallet: walletAddress,
                    referralCode,
                    isPremium,
                    inviteeUsername: username
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to apply referral')
            }

            return { success: true, data }
        } catch (err) {
            console.error('Apply referral error:', err)
            return { success: false, error: err.message }
        }
    }, [walletAddress])

    // Share referral link
    const shareReferralLink = useCallback(async () => {
        if (!referralData?.referralLink) return

        // Check if running in Telegram
        const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null

        if (tg) {
            // Use Telegram share
            tg.openTelegramLink(
                `https://t.me/share/url?url=${encodeURIComponent(referralData.referralLink)}&text=${encodeURIComponent('¡Únete a ChessDAO y gana 1,000 $GAME de bienvenida! ♟️')}`
            )
        } else if (navigator.share) {
            // Use Web Share API
            try {
                await navigator.share({
                    title: 'ChessDAO - Play Chess & Earn',
                    text: '¡Únete a ChessDAO y gana 1,000 $GAME de bienvenida!',
                    url: referralData.referralLink
                })
            } catch (err) {
                // User cancelled or error
                console.log('Share cancelled')
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(referralData.referralLink)
            return 'copied'
        }
    }, [referralData])

    // Copy code to clipboard
    const copyCode = useCallback(async () => {
        if (!referralData?.referralCode) return false

        try {
            await navigator.clipboard.writeText(referralData.referralCode)
            return true
        } catch {
            return false
        }
    }, [referralData])

    // Load on mount
    useEffect(() => {
        fetchReferralData()
    }, [fetchReferralData])

    return {
        referralData,
        loading,
        error,
        actions: {
            refresh: fetchReferralData,
            applyReferralCode,
            shareReferralLink,
            copyCode
        }
    }
}

/**
 * Extract referral code from Telegram startapp parameter
 * Format: REF_XXXXXX
 */
export function extractReferralCode() {
    if (typeof window === 'undefined') return null

    const tg = window.Telegram?.WebApp

    if (tg?.initDataUnsafe?.start_param) {
        const param = tg.initDataUnsafe.start_param
        if (param.startsWith('REF_')) {
            return param.substring(4) // Remove 'REF_' prefix
        }
    }

    return null
}
