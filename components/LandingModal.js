'use client'

import { useState, useEffect } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Users, Zap } from 'lucide-react'

export default function LandingModal({ onClose }) {
  const [loginType, setLoginType] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSocialLogin = (provider) => {
    // Demo implementation
    alert(`${provider} login coming soon! For now, please connect your Phantom wallet.`)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Crown className="h-12 w-12 text-yellow-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">DAO Chess</h1>
          </div>
          <p className="text-slate-300 text-lg">
            Play chess, earn tokens, and participate in decentralized gameplay
          </p>
        </div>

        {/* Login Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Wallet Connect */}
          <Card className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center">
                <Zap className="h-6 w-6 mr-2 text-purple-400" />
                Connect Wallet
              </CardTitle>
              <CardDescription className="text-slate-300">
                Connect your Phantom wallet to start playing
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
            </CardContent>
          </Card>

          {/* Google Login */}
          <Card className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center">
                <Users className="h-6 w-6 mr-2 text-red-400" />
                Google Login
              </CardTitle>
              <CardDescription className="text-slate-300">
                Sign in with your Google account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => handleSocialLogin('Google')}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Continue with Google
              </Button>
            </CardContent>
          </Card>

          {/* Facebook Login */}
          <Card className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center">
                <Users className="h-6 w-6 mr-2 text-blue-400" />
                Facebook Login
              </CardTitle>
              <CardDescription className="text-slate-300">
                Sign in with your Facebook account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => handleSocialLogin('Facebook')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue with Facebook
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 text-slate-300">
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">🏛️ Community Mode (DAO)</h3>
            <ul className="space-y-2">
              <li>• Vote on moves with your tokens</li>
              <li>• Participate in community decisions</li>
              <li>• Earn rewards for good suggestions</li>
              <li>• Democratic chess gameplay</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">⚔️ PVP Mode (Betting)</h3>
            <ul className="space-y-2">
              <li>• Bet tokens against opponents</li>
              <li>• Winner takes the pot</li>
              <li>• Skill-based token earning</li>
              <li>• Competitive leaderboards</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}