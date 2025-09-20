'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Crown, Coins, Trophy, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WalletBar() {
  const { connected, publicKey } = useWallet()
  const [tokenBalance, setTokenBalance] = useState(0)
  const [solBalance, setSolBalance] = useState(0)

  useEffect(() => {
    if (connected && publicKey) {
      // Mock balance for now - in real app, fetch from blockchain
      setTokenBalance(1000)
      setSolBalance(2.5)
    }
  }, [connected, publicKey])

  if (!connected) {
    return null
  }

  return (
    <div className="bg-slate-800 border-b border-slate-700 p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <Crown className="h-8 w-8 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">DAO Chess</h1>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6">
          {/* Token Balance */}
          <Card className="bg-slate-700 border-slate-600 px-4 py-2">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="text-sm text-slate-400">CHESS Tokens</div>
                <div className="text-lg font-semibold text-white">{tokenBalance.toLocaleString()}</div>
              </div>
            </div>
          </Card>

          {/* SOL Balance */}
          <Card className="bg-slate-700 border-slate-600 px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">◎</span>
              </div>
              <div>
                <div className="text-sm text-slate-400">SOL Balance</div>
                <div className="text-lg font-semibold text-white">{solBalance}</div>
              </div>
            </div>
          </Card>

          {/* Rank */}
          <Card className="bg-slate-700 border-slate-600 px-4 py-2">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-orange-400" />
              <div>
                <div className="text-sm text-slate-400">Rank</div>
                <div className="text-lg font-semibold text-white">#342</div>
              </div>
            </div>
          </Card>

          {/* Buy Tokens Button */}
          <Button className="bg-green-600 hover:bg-green-700">
            Buy CHESS Tokens
          </Button>

          {/* Wallet Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <WalletDisconnectButton />
          </div>
        </div>
      </div>
    </div>
  )
}