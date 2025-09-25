'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Coins, CreditCard, DollarSign, Zap, Gift, Crown, Star } from 'lucide-react'
import { useChessTokens } from '@/hooks/useChessTokens'

export default function TokenPurchase({ onClose }) {
  const { publicKey } = useWallet()
  const { tokenInfo, actions: { formatChessAmount } } = useChessTokens()
  const [loading, setLoading] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedPackage, setSelectedPackage] = useState(null)

  // Token packages with bonuses
  const packages = [
    {
      id: 'starter',
      name: 'Starter Pack',
      tokens: 1000,
      price: 10,
      bonus: 0,
      icon: <Zap className="h-6 w-6" />,
      color: 'bg-blue-500',
      popular: false
    },
    {
      id: 'gamer',
      name: 'Gamer Pack',
      tokens: 5000,
      price: 45,
      bonus: 1000,
      icon: <Gift className="h-6 w-6" />,
      color: 'bg-green-500',
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      tokens: 10000,
      price: 80,
      bonus: 2500,
      icon: <Crown className="h-6 w-6" />,
      color: 'bg-purple-500',
      popular: false
    },
    {
      id: 'master',
      name: 'Master Pack',
      tokens: 25000,
      price: 180,
      bonus: 7500,
      icon: <Star className="h-6 w-6" />,
      color: 'bg-yellow-500',
      popular: false
    }
  ]

  const handlePackagePurchase = async (pkg) => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setLoading(true)
    setSelectedPackage(pkg.id)

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: pkg.id,
          packageName: pkg.name,
          tokens: pkg.tokens + pkg.bonus,
          price: pkg.price,
          walletAddress: publicKey.toString(),
          successUrl: window.location.origin + '/purchase-success',
          cancelUrl: window.location.origin + '/'
        })
      })

      const data = await response.json()

      if (data.success && data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl
      } else {
        alert('Error creating payment session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment error: ' + error.message)
    } finally {
      setLoading(false)
      setSelectedPackage(null)
    }
  }

  const handleCustomPurchase = async () => {
    const amount = parseFloat(customAmount)
    if (!amount || amount < 1) {
      alert('Please enter a valid amount (minimum $1)')
      return
    }

    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setLoading(true)

    try {
      const tokens = Math.floor(amount / (tokenInfo?.price || 0.01))
      
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: 'custom',
          packageName: 'Custom Purchase',
          tokens: tokens,
          price: amount,
          walletAddress: publicKey.toString(),
          successUrl: window.location.origin + '/purchase-success',
          cancelUrl: window.location.origin + '/'
        })
      })

      const data = await response.json()

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert('Error creating payment session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTokensForAmount = (amount) => {
    return Math.floor(amount / (tokenInfo?.price || 0.01))
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="bg-slate-800 border-slate-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white flex items-center">
                <Coins className="h-8 w-8 mr-3 text-yellow-400" />
                Buy CHESS Tokens
              </CardTitle>
              <CardDescription className="text-slate-400">
                Purchase tokens to play games and participate in DAO voting
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-slate-400">
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Token Info */}
          {tokenInfo && (
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Current Token Price</div>
                  <div className="text-slate-400 text-sm">1 CHESS = ${tokenInfo.price} USD</div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold text-xl">${tokenInfo.price}</div>
                  <div className="text-slate-400 text-sm">per token</div>
                </div>
              </div>
            </div>
          )}

          {/* Package Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Choose a Package</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`border-2 transition-all cursor-pointer relative ${
                    selectedPackage === pkg.id ? 'border-blue-500 bg-slate-600' : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-orange-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-full ${pkg.color} flex items-center justify-center text-white mx-auto mb-3`}>
                      {pkg.icon}
                    </div>
                    
                    <h4 className="text-lg font-semibold text-white mb-2">{pkg.name}</h4>
                    
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-white">
                        {formatChessAmount(pkg.tokens)}
                      </div>
                      {pkg.bonus > 0 && (
                        <div className="text-green-400 text-sm">
                          + {formatChessAmount(pkg.bonus)} bonus
                        </div>
                      )}
                      <div className="text-slate-400 text-sm">CHESS tokens</div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-green-400">${pkg.price}</div>
                      <div className="text-slate-400 text-sm">USD</div>
                    </div>
                    
                    {pkg.bonus > 0 && (
                      <div className="text-xs text-green-400 mb-3">
                        {Math.round((pkg.bonus / pkg.tokens) * 100)}% bonus tokens!
                      </div>
                    )}
                    
                    <Button
                      onClick={() => handlePackagePurchase(pkg)}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {loading && selectedPackage === pkg.id ? (
                        'Processing...'
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Custom Amount</h3>
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Amount in USD</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="pl-10 bg-slate-800 border-slate-600 text-white"
                        min="1"
                        step="0.01"
                      />
                    </div>
                    {customAmount && (
                      <div className="mt-2 text-sm text-slate-400">
                        You'll receive: {formatChessAmount(getTokensForAmount(parseFloat(customAmount)))} CHESS
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      onClick={handleCustomPurchase}
                      disabled={loading || !customAmount || parseFloat(customAmount) < 1}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {loading ? (
                        'Processing...'
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Buy Custom Amount
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Secure Payment</h4>
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <span>💳 Credit Cards</span>
              <span>•</span>
              <span>🏦 Bank Transfer</span>
              <span>•</span>
              <span>🔒 SSL Encrypted</span>
              <span>•</span>
              <span>⚡ Instant Delivery</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}