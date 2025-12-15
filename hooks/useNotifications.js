'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar notificaciones
 */
export function useNotifications() {
    const { publicKey, connected } = useWallet()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch notifications
    const fetchNotifications = useCallback(async (unreadOnly = false) => {
        if (!connected || !publicKey) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const url = `/api/user/notifications?wallet=${publicKey.toString()}${unreadOnly ? '&unread=true' : ''}`
            const res = await apiFetch(url)
            const data = await res.json()

            if (res.ok) {
                setNotifications(data.notifications || [])
                setUnreadCount(data.unreadCount || 0)
            } else {
                setError(data.error)
            }
        } catch (err) {
            console.error('Error fetching notifications:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    // Mark as read
    const markAsRead = useCallback(async (notificationId) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/notifications', {
                method: 'PUT',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    notificationId,
                    action: 'read'
                })
            })

            const data = await res.json()

            if (res.ok) {
                // Update local state
                setNotifications(prev => prev.map(n =>
                    n.id === notificationId ? { ...n, read: true } : n
                ))
                setUnreadCount(prev => Math.max(0, prev - 1))
                return { success: true }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey])

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/notifications', {
                method: 'PUT',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    markAllRead: true
                })
            })

            const data = await res.json()

            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
                return { success: true }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey])

    // Dismiss notification
    const dismiss = useCallback(async (notificationId) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/notifications', {
                method: 'PUT',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    notificationId,
                    action: 'dismiss'
                })
            })

            const data = await res.json()

            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId))
                return { success: true }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey])

    // Fetch on mount and set up polling
    useEffect(() => {
        fetchNotifications()

        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
            if (connected && publicKey) {
                fetchNotifications()
            }
        }, 30000)

        return () => clearInterval(interval)
    }, [fetchNotifications, connected, publicKey])

    return {
        notifications,
        unreadCount,
        hasUnread: unreadCount > 0,
        loading,
        error,
        actions: {
            refresh: fetchNotifications,
            markAsRead,
            markAllAsRead,
            dismiss
        }
    }
}
