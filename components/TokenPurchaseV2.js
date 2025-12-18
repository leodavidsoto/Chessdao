'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Coins, Star, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/config'

const CHESS_TOKEN_PRICE = Number(process.env.CHESS_TOKEN_PRICE) || 0.01 // $0.01 USD per CHESS token

export default function TokenPurchaseV2({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('TON') // 'TON' or 'STARS'
  const [tokenAmount, setTokenAmount] = useState('')
  const [tonPrice, setTonPrice] = useState(2.5) // Default TON price in USD
  const [processingTx, setProcessingTx] = useState(false)

  const calculatePaymentAmount = () => {
    const tokens = parseFloat(tokenAmount) || 0
    const usdAmount = tokens * CHESS_TOKEN_PRICE

    if (paymentMethod === 'TON') {
      return (usdAmount / tonPrice).toFixed(4)
    } else {
      // Stars: approximately 50 stars per $1 USD
      return Math.ceil(usdAmount * 50)
    }
  }

  const handlePurchase = async () => {
    const tokens = parseFloat(tokenAmount)
    if (!tokens || tokens < 100) {
      toast.error('Minimum purchase is 100 CHESS tokens')
      return
    }

    setLoading(true)
    setProcessingTx(true)

    try {
      // For TON: Use TON Connect or Telegram Wallet
      if (paymentMethod === 'TON') {
        toast.info('Conectando con TON wallet...')
        // TODO: Integrate TON Connect payment flow
        toast.success('Sistema TON en desarrollo. Usa Stars por ahora.')
      } else {
        // For Stars: Use Telegram Stars API
        if (window.Telegram?.WebApp) {
          const starsAmount = calculatePaymentAmount()
          toast.info(`Procesando pago de ${starsAmount} Stars...`)

          // Invoke Telegram Stars payment
          window.Telegram.WebApp.openInvoice({
            title: `${tokens} CHESS Tokens`,
            description: `Purchase ${tokens} CHESS tokens for DAO Chess`,
            currency: 'XTR', // Telegram Stars currency
            prices: [{ label: 'CHESS Tokens', amount: parseInt(starsAmount) }]
          }, (status) => {
            if (status === 'paid') {
              toast.success(`¡Compra exitosa! ${tokens} CHESS tokens añadidos`)
              setTimeout(() => {
                onClose()
                window.location.reload()
              }, 2000)
            } else {
              toast.error('Payment cancelled or failed')
            }
          })
        } else {
          toast.error('Telegram Stars only available in Telegram Mini App')
        }
      }
    } catch (error) {
      console.error('❌ Payment error:', error)
      toast.error('Payment failed', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
      setProcessingTx(false)
    }
  }

  const paymentAmountDisplay = calculatePaymentAmount()
  const usdAmount = (parseFloat(tokenAmount) || 0) * CHESS_TOKEN_PRICE

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="bg-slate-800 border-slate-600 max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white flex items-center">
                <Coins className="h-8 w-8 mr-3 text-yellow-400" />
                Buy CHESS Tokens
              </CardTitle>
              <CardDescription className="text-slate-400">
                Pay with TON or Stars ⭐ • 1 CHESS = $0.01 USD
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-slate-400" disabled={processingTx}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Token Amount Input */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block font-semibold">
              How many CHESS tokens do you want?
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400" />
              <Input
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="Enter token amount (min 100)"
                className="pl-10 bg-slate-700 border-slate-600 text-white text-lg h-12"
                min="100"
                step="100"
                disabled={processingTx}
              />
            </div>
            {tokenAmount && parseFloat(tokenAmount) >= 100 && (
              <div className="mt-2 text-sm text-green-400">
                = ${usdAmount.toFixed(2)} USD
              </div>
            )}
            {tokenAmount && parseFloat(tokenAmount) < 100 && (
              <div className="mt-2 text-sm text-red-400">
                Minimum 100 tokens required
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="text-sm text-slate-400 mb-3 block font-semibold">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all border-2 ${paymentMethod === 'TON'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                  }`}
                onClick={() => !processingTx && setPaymentMethod('TON')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div className="text-white font-semibold">Pay with TON</div>
                  <div className="text-xs text-slate-400 mt-1">
                    1 TON ≈ ${tonPrice.toFixed(2)}
                  </div>
                  {paymentMethod === 'TON' && (
                    <Badge className="mt-2 bg-blue-500">Selected</Badge>
                  )}
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-2 ${paymentMethod === 'STARS'
                    ? 'border-yellow-500 bg-yellow-900/20'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                  }`}
                onClick={() => !processingTx && setPaymentMethod('STARS')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-white font-semibold">Pay with Stars ⭐</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Telegram Stars
                  </div>
                  {paymentMethod === 'STARS' && (
                    <Badge className="mt-2 bg-yellow-500">Selected</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment Summary */}
          {tokenAmount && parseFloat(tokenAmount) >= 100 && (
            <Card className="bg-gradient-to-r from-slate-700 to-slate-600 border-slate-500">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                  Payment Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">CHESS Tokens:</span>
                    <span className="text-white font-semibold">{parseFloat(tokenAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Price per token:</span>
                    <span className="text-white">${CHESS_TOKEN_PRICE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total USD:</span>
                    <span className="text-white">${usdAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-500 pt-2 mt-2"></div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">You Pay:</span>
                    <span className="text-green-400 font-bold text-lg">
                      {paymentAmountDisplay} {paymentMethod === 'STARS' ? '⭐ Stars' : 'TON'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={loading || processingTx || !tokenAmount || parseFloat(tokenAmount) < 100}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold h-12 text-lg"
          >
            {processingTx ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing Transaction...
              </>
            ) : loading ? (
              'Loading...'
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Buy {tokenAmount || '0'} CHESS Tokens
              </>
            )}
          </Button>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-300">
                <p className="font-semibold text-blue-300 mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Select payment method: TON or Telegram Stars</li>
                  <li>Transaction is verified on TON blockchain</li>
                  <li>CHESS tokens are credited to your account instantly</li>
                  <li>Use tokens to play PvP games and earn more!</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}