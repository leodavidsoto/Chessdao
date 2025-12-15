'use client'

import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token'
import { apiFetch } from '@/lib/config'

// Contract configuration
const PROGRAM_ID = new PublicKey('CHESSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') // TODO: Update after deployment
const CHESS_MINT = new PublicKey('B5WLyVEUc3wYMH1cn8bwVmRNRCg8JkJQyYjM1PLECDkt')
const TREASURY_WALLET = new PublicKey('3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo')

// Game status enum matching the contract
export const GameStatus = {
    Waiting: 0,
    Active: 1,
    Completed: 2,
    Draw: 3,
    Cancelled: 4,
    Timeout: 5
}

/**
 * Hook para interactuar con el Smart Contract de Game Escrow
 */
export function useGameContract() {
    const { publicKey, signTransaction, connected } = useWallet()
    const { connection } = useConnection()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Helper: Get PDA addresses
    const getPDAs = useCallback(async (gameId) => {
        const [tokenState] = PublicKey.findProgramAddressSync(
            [Buffer.from('token_state')],
            PROGRAM_ID
        )

        const [blacklist] = PublicKey.findProgramAddressSync(
            [Buffer.from('blacklist')],
            PROGRAM_ID
        )

        const [gameCounter] = PublicKey.findProgramAddressSync(
            [Buffer.from('game_counter')],
            PROGRAM_ID
        )

        const gameIdBuffer = Buffer.alloc(8)
        gameIdBuffer.writeBigUInt64LE(BigInt(gameId || 0))

        const [gameMatch] = PublicKey.findProgramAddressSync(
            [Buffer.from('game'), gameIdBuffer],
            PROGRAM_ID
        )

        const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from('game_escrow'), gameIdBuffer],
            PROGRAM_ID
        )

        return {
            tokenState,
            blacklist,
            gameCounter,
            gameMatch,
            escrowTokenAccount
        }
    }, [])

    // Get user's token account
    const getUserTokenAccount = useCallback(async (userPubkey) => {
        return await getAssociatedTokenAddress(
            CHESS_MINT,
            userPubkey
        )
    }, [])

    /**
     * Create a new game with a bet
     * @param {number} betAmount - Amount of CHESS tokens to bet
     * @param {string} timeControl - Time control (e.g., "5+0", "10+5")  
     * @param {string} gameTitle - Title of the game
     * @returns {Promise<{success: boolean, gameId?: number, signature?: string, error?: string}>}
     */
    const createGame = useCallback(async (betAmount, timeControl = '10+0', gameTitle = '') => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        setLoading(true)
        setError(null)

        try {
            // For now, we'll use the API endpoint until the contract is deployed
            // This simulates the on-chain behavior
            const response = await apiFetch('/api/game/create', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    betAmount,
                    timeControl,
                    gameTitle: gameTitle || `${timeControl} Match - ${betAmount} CHESS`
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create game')
            }

            console.log('🎮 Game created:', data)
            return {
                success: true,
                gameId: data.gameId,
                signature: data.signature || `game_${data.gameId}`
            }

        } catch (err) {
            console.error('Error creating game:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    /**
     * Join an existing game
     * @param {number} gameId - ID of the game to join
     * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
     */
    const joinGame = useCallback(async (gameId) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch('/api/game/join', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    gameId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to join game')
            }

            console.log('🎮 Joined game:', data)
            return {
                success: true,
                signature: data.signature || `join_${gameId}`,
                totalPot: data.totalPot
            }

        } catch (err) {
            console.error('Error joining game:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    /**
     * Resolve a completed game
     * @param {number} gameId - ID of the game
     * @param {string} winnerAddress - Public key of the winner (or null for draw)
     * @param {boolean} isDraw - Whether the game ended in a draw
     * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
     */
    const resolveGame = useCallback(async (gameId, winnerAddress, isDraw = false) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch('/api/game/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    gameId,
                    winnerAddress,
                    isDraw
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resolve game')
            }

            console.log('🏆 Game resolved:', data)
            return {
                success: true,
                signature: data.signature,
                prizeAmount: data.prizeAmount,
                daoFee: data.daoFee
            }

        } catch (err) {
            console.error('Error resolving game:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    /**
     * Cancel a game that hasn't started yet
     * @param {number} gameId - ID of the game to cancel
     * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
     */
    const cancelGame = useCallback(async (gameId) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch('/api/game/cancel', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    gameId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel game')
            }

            console.log('❌ Game cancelled:', data)
            return {
                success: true,
                signature: data.signature,
                refundAmount: data.refundAmount
            }

        } catch (err) {
            console.error('Error cancelling game:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    /**
     * Claim funds from a timed-out game
     * @param {number} gameId - ID of the game
     * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
     */
    const timeoutClaim = useCallback(async (gameId) => {
        if (!connected || !publicKey) {
            return { success: false, error: 'Wallet not connected' }
        }

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch('/api/game/timeout-claim', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    gameId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to claim timeout')
            }

            console.log('⏰ Timeout claimed:', data)
            return {
                success: true,
                signature: data.signature,
                prizeAmount: data.prizeAmount
            }

        } catch (err) {
            console.error('Error claiming timeout:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [connected, publicKey])

    /**
     * Get all active games available to join
     * @returns {Promise<Array>}
     */
    const getActiveGames = useCallback(async () => {
        try {
            const response = await apiFetch('/api/game/active')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch active games')
            }

            return data.games || []
        } catch (err) {
            console.error('Error fetching active games:', err)
            return []
        }
    }, [])

    /**
     * Get game details by ID
     * @param {number} gameId 
     * @returns {Promise<Object|null>}
     */
    const getGameDetails = useCallback(async (gameId) => {
        try {
            const response = await apiFetch(`/api/game/${gameId}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch game details')
            }

            return data.game
        } catch (err) {
            console.error('Error fetching game details:', err)
            return null
        }
    }, [])

    return {
        // State
        loading,
        error,
        connected,

        // Actions
        createGame,
        joinGame,
        resolveGame,
        cancelGame,
        timeoutClaim,
        getActiveGames,
        getGameDetails,

        // Helpers
        getPDAs,
        getUserTokenAccount,

        // Constants
        PROGRAM_ID,
        CHESS_MINT,
        TREASURY_WALLET,
        GameStatus
    }
}

export default useGameContract
