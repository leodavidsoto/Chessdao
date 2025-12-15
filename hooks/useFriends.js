'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { apiFetch } from '@/lib/config'

/**
 * Hook para manejar amigos y seguidores
 */
export function useFriends() {
    const { publicKey, connected } = useWallet()
    const [friends, setFriends] = useState([])
    const [followers, setFollowers] = useState([])
    const [following, setFollowing] = useState([])
    const [pendingIncoming, setPendingIncoming] = useState([])
    const [pendingSent, setPendingSent] = useState([])
    const [counts, setCounts] = useState({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch friends
    const fetchFriends = useCallback(async () => {
        if (!connected || !publicKey) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await apiFetch(`/api/user/friends?wallet=${publicKey.toString()}`)
            const data = await res.json()

            if (res.ok) {
                setFriends(data.friends || [])
                setFollowers(data.followers || [])
                setFollowing(data.following || [])
                setPendingIncoming(data.pendingIncoming || [])
                setPendingSent(data.pendingSent || [])
                setCounts(data.counts || {})
            } else {
                setError(data.error)
            }
        } catch (err) {
            console.error('Error fetching friends:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    // Send friend request
    const sendFriendRequest = useCallback(async (friendWallet, type = 'friend') => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/friends', {
                method: 'POST',
                body: JSON.stringify({
                    userId: publicKey.toString(),
                    friendId: friendWallet,
                    type
                })
            })

            const data = await res.json()

            if (res.ok) {
                await fetchFriends()
                return { success: true, data }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey, fetchFriends])

    // Respond to friend request
    const respondToRequest = useCallback(async (friendshipId, action) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch('/api/user/friends', {
                method: 'PUT',
                body: JSON.stringify({
                    friendshipId,
                    walletAddress: publicKey.toString(),
                    action
                })
            })

            const data = await res.json()

            if (res.ok) {
                await fetchFriends()
                return { success: true, data }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey, fetchFriends])

    // Remove friend
    const removeFriend = useCallback(async (friendshipId) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        try {
            const res = await apiFetch(
                `/api/user/friends?friendshipId=${friendshipId}&wallet=${publicKey.toString()}`,
                { method: 'DELETE' }
            )

            const data = await res.json()

            if (res.ok) {
                await fetchFriends()
                return { success: true }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: err.message }
        }
    }, [connected, publicKey, fetchFriends])

    // Follow user
    const followUser = useCallback(async (userWallet) => {
        return sendFriendRequest(userWallet, 'follow')
    }, [sendFriendRequest])

    // Fetch on mount
    useEffect(() => {
        fetchFriends()
    }, [fetchFriends])

    // Get online friends
    const onlineFriends = friends.filter(f => f.isOnline)

    return {
        friends,
        followers,
        following,
        pendingIncoming,
        pendingSent,
        counts,
        onlineFriends,
        loading,
        error,
        actions: {
            refresh: fetchFriends,
            sendFriendRequest,
            followUser,
            acceptRequest: (id) => respondToRequest(id, 'accept'),
            declineRequest: (id) => respondToRequest(id, 'decline'),
            blockUser: (id) => respondToRequest(id, 'block'),
            removeFriend
        }
    }
}
