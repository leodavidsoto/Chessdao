'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Crown, Coins, Trophy, Settings, RefreshCw, ArrowDownUp } from 'lucide-react'
import { useChessTokens } from '@/hooks/useChessTokens'
import { useGameTokens } from '@/hooks/useGameTokens'
import { useState, useEffect } from 'react'
import TokenPurchaseV2 from './TokenPurchaseV2'
import TokenSwap from './TokenSwap'

export default function WalletBar() {
  const { connected, publicKey } = useWallet()
  const [mounted, setMounted] = useState(false)
  const {
    chessBalance,
    solBalance,
    tokenInfo,
    loading: chessLoading,
    actions: { refreshBalances: refreshChessBalance, formatChessAmount, formatSolAmount, getUsdValue }
  } = useChessTokens()
  const {
    gameBalance,
    loading: gameLoading,
    actions: { refreshBalance: refreshGameBalance, formatAmount: formatGameAmount }
  } = useGameTokens()
  const [refreshing, setRefreshing] = useState(false)
  const [showTokenPurchase, setShowTokenPurchase] = useState(false)
  const [showSwap, setShowSwap] = useState(false)

  const loading = chessLoading || gameLoading

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refreshChessBalance(), refreshGameBalance()])
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleBuyTokens = () => {
    setShowTokenPurchase(true)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!connected || !mounted) {
    return null
  }

  return (
    <>
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">DAO Chess</h1>
              <p className="text-xs text-slate-400">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-3">
            {/* $GAME Balance - Internal tokens for games */}
            <Card className="bg-yellow-500/10 border-yellow-500/30 px-4 py-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🎮</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-yellow-400 font-medium">$GAME</div>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {loading ? '...' : formatGameAmount(gameBalance)}
                  </div>
                  <div className="text-xs text-slate-400">Para juegos</div>
                </div>
              </div>
            </Card>

            {/* CHESS Token Balance */}
            <Card className="bg-purple-500/10 border-purple-500/30 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-purple-400 font-medium">CHESS</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading || refreshing}
                      className="h-4 w-4 p-0 hover:bg-slate-600"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {loading ? '...' : formatChessAmount(chessBalance)}
                  </div>
                  {tokenInfo && (
                    <div className="text-xs text-slate-400">
                      ≈ ${getUsdValue(chessBalance)} USD
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* SOL Balance */}
            <Card className="bg-slate-700 border-slate-600 px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">◎</span>
                </div>
                <div>
                  <div className="text-sm text-slate-400">SOL</div>
                  <div className="text-lg font-semibold text-white">
                    {loading ? '...' : formatSolAmount(solBalance)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Player Stats */}
            <Card className="bg-slate-700 border-slate-600 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-sm text-slate-400">Rating</div>
                  <div className="text-lg font-semibold text-white">1650</div>
                </div>
              </div>
            </Card>

            {/* Swap Button */}
            <Button
              onClick={() => setShowSwap(true)}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20 font-semibold px-4"
            >
              <ArrowDownUp className="h-4 w-4 mr-2" />
              Swap
            </Button>

            {/* Buy Tokens Button */}
            <Button
              onClick={handleBuyTokens}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6"
            >
              <Coins className="h-4 w-4 mr-2" />
              Comprar
            </Button>

            {/* Wallet Controls */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700">
                <Settings className="h-4 w-4" />
              </Button>
              <WalletDisconnectButton className="!bg-slate-600 hover:!bg-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Token Purchase Modal */}
      {showTokenPurchase && (
        <TokenPurchaseV2 onClose={() => setShowTokenPurchase(false)} />
      )}

      {/* Token Swap Modal */}
      {showSwap && (
        <TokenSwap
          onClose={() => setShowSwap(false)}
          onSwapComplete={() => {
            handleRefresh()
          }}
        />
      )}
    </>
  )
}