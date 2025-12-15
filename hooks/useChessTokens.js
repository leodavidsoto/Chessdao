'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { getChessBalance, getSolBalance, getTokenInfo } from '@/lib/solana'
import { apiFetch } from '@/lib/config'

export function useChessTokens() {
  const { publicKey, connected } = useWallet()
  const [chessBalance, setChessBalance] = useState(0)
  const [solBalance, setSolBalance] = useState(0)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchBalances = async () => {
    if (!connected || !publicKey) return

    setLoading(true)
    try {
      const walletAddress = publicKey.toString()
      console.log(`🔍 Fetching balances for wallet: ${walletAddress}`)

      // Try to get balance from MongoDB API first (persistent storage)
      try {
        const apiRes = await apiFetch(`/api/balance?wallet=${walletAddress}`)
        if (apiRes.ok) {
          const apiData = await apiRes.json()
          if (!apiData.demo && apiData.chessBalance !== undefined) {
            console.log(`📊 Got persistent balance from DB: ${apiData.chessBalance} CHESS`)
            setChessBalance(apiData.chessBalance)

            // Get real SOL balance from blockchain
            const solAmount = await getSolBalance(walletAddress)
            setSolBalance(solAmount)

            setTokenInfo(await getTokenInfo())
            setLastUpdate(new Date())
            return
          }
        }
      } catch (apiError) {
        console.log('📝 API unavailable, falling back to Solana functions')
      }

      // Fallback to Solana functions (demo mode)
      const [chessAmount, solAmount, info] = await Promise.all([
        getChessBalance(walletAddress),
        getSolBalance(walletAddress),
        getTokenInfo()
      ])

      console.log(`📊 Fetched balances - CHESS: ${chessAmount}, SOL: ${solAmount}`)

      setChessBalance(chessAmount)
      setSolBalance(solAmount)
      setTokenInfo(info)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching balances:', error)
      // Set fallback values on error
      setChessBalance(1000) // Fallback balance
      setSolBalance(2.5)
      setTokenInfo({
        name: 'CHESS',
        symbol: 'CHESS',
        decimals: 6,
        price: 0.01
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [connected, publicKey])

  // Auto-refresh balances every 30 seconds
  useEffect(() => {
    if (!connected) return

    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [connected])

  const refreshBalances = () => {
    fetchBalances()
  }

  const formatChessAmount = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount)
  }

  const formatSolAmount = (amount) => {
    return parseFloat(amount).toFixed(4)
  }

  const getUsdValue = (chessAmount) => {
    if (!tokenInfo) return 0
    return (chessAmount * tokenInfo.price).toFixed(2)
  }

  return {
    chessBalance,
    solBalance,
    tokenInfo,
    loading,
    lastUpdate,
    actions: {
      refreshBalances,
      formatChessAmount,
      formatSolAmount,
      getUsdValue
    }
  }
}