'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Coins, DollarSign, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/config'

const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo'
const CHESS_TOKEN_PRICE = Number(process.env.CHESS_TOKEN_PRICE) || 0.01 // $0.01 USD per CHESS token
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'

// USDC Mint addresses
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mainnet
const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // USDC devnet
const USDC_DECIMALS = 6 // USDC has 6 decimals

export default function TokenPurchaseV2({ onClose }) {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('SOL') // 'SOL' or 'USDC'
  const [tokenAmount, setTokenAmount] = useState('')
  const [solPrice, setSolPrice] = useState(150) // Default SOL price in USD
  const [processingTx, setProcessingTx] = useState(false)

  // Fetch current SOL price from API
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        const data = await response.json()
        if (data?.solana?.usd) {
          setSolPrice(data.solana.usd)
        }
      } catch (error) {
        console.error('Error fetching SOL price:', error)
        setSolPrice(150) // Fallback price
      }
    }
    fetchSolPrice()
  }, [])

  const calculatePaymentAmount = () => {
    const tokens = parseFloat(tokenAmount) || 0
    const usdAmount = tokens * CHESS_TOKEN_PRICE
    
    if (paymentMethod === 'SOL') {
      return (usdAmount / solPrice).toFixed(4)
    } else {
      return usdAmount.toFixed(2)
    }
  }

  const handlePurchaseWithSOL = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first')
      return
    }

    const tokens = parseFloat(tokenAmount)
    if (!tokens || tokens < 100) {
      toast.error('Minimum purchase is 100 CHESS tokens')
      return
    }

    setLoading(true)
    setProcessingTx(true)

    try {
      const usdAmount = tokens * CHESS_TOKEN_PRICE
      const solAmount = usdAmount / solPrice
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL)

      console.log(`💰 Purchasing ${tokens} CHESS tokens for ${solAmount} SOL ($${usdAmount})`)

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TREASURY_WALLET),
          lamports: lamports,
        })
      )

      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      console.log('📝 Transaction sent:', signature)

      toast.info('Processing payment...', {
        description: 'Waiting for blockchain confirmation'
      })

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed')
      }

      console.log('✅ Payment confirmed!')

      // Credit tokens via API
      const response = await apiFetch('/api/payments/credit-tokens', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          tokens: tokens,
          paymentMethod: 'SOL',
          paymentAmount: solAmount,
          usdAmount: usdAmount,
          transactionSignature: signature
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Purchase successful!', {
          description: `${tokens} CHESS tokens have been credited to your account`
        })
        
        // Wait a bit then close and refresh
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 2000)
      } else {
        throw new Error(result.error || 'Failed to credit tokens')
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

  const handlePurchaseWithUSDC = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first')
      return
    }

    const tokens = parseFloat(tokenAmount)
    if (!tokens || tokens < 100) {
      toast.error('Minimum purchase is 100 CHESS tokens')
      return
    }

    setLoading(true)
    setProcessingTx(true)

    try {
      const usdAmount = tokens * CHESS_TOKEN_PRICE
      const usdcMintAddress = SOLANA_NETWORK === 'mainnet-beta' ? USDC_MINT : USDC_DEVNET_MINT
      const usdcMint = new PublicKey(usdcMintAddress)
      const treasuryPubkey = new PublicKey(TREASURY_WALLET)

      console.log(`Purchasing ${tokens} CHESS tokens for ${usdAmount} USDC`)

      // Get user's USDC token account
      const userUsdcAccount = await getAssociatedTokenAddress(
        usdcMint,
        publicKey
      )

      // Check if user has USDC token account and sufficient balance
      try {
        const accountInfo = await getAccount(connection, userUsdcAccount)
        const balance = Number(accountInfo.amount) / Math.pow(10, USDC_DECIMALS)

        if (balance < usdAmount) {
          toast.error('Insufficient USDC balance', {
            description: `You have ${balance.toFixed(2)} USDC, need ${usdAmount.toFixed(2)} USDC`
          })
          return
        }
      } catch (e) {
        toast.error('No USDC token account found', {
          description: 'Please add USDC to your wallet first'
        })
        return
      }

      // Get treasury's USDC token account (create if needed)
      const treasuryUsdcAccount = await getAssociatedTokenAddress(
        usdcMint,
        treasuryPubkey
      )

      // Build transaction
      const transaction = new Transaction()

      // Check if treasury USDC account exists, if not add instruction to create it
      try {
        await getAccount(connection, treasuryUsdcAccount)
      } catch (e) {
        // Treasury account doesn't exist, add instruction to create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            treasuryUsdcAccount,
            treasuryPubkey,
            usdcMint
          )
        )
      }

      // Add transfer instruction
      const transferAmount = Math.floor(usdAmount * Math.pow(10, USDC_DECIMALS))
      transaction.add(
        createTransferInstruction(
          userUsdcAccount,
          treasuryUsdcAccount,
          publicKey,
          transferAmount
        )
      )

      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      console.log('Transaction sent:', signature)

      toast.info('Processing USDC payment...', {
        description: 'Waiting for blockchain confirmation'
      })

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed')

      if (confirmation.value.err) {
        throw new Error('Transaction failed')
      }

      console.log('Payment confirmed!')

      // Credit tokens via API
      const response = await apiFetch('/api/payments/credit-tokens', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          tokens: tokens,
          paymentMethod: 'USDC',
          paymentAmount: usdAmount,
          usdAmount: usdAmount,
          transactionSignature: signature
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Purchase successful!', {
          description: `${tokens} CHESS tokens have been credited to your account`
        })

        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 2000)
      } else {
        throw new Error(result.error || 'Failed to credit tokens')
      }

    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
      setProcessingTx(false)
    }
  }

  const handlePurchase = () => {
    if (paymentMethod === 'SOL') {
      handlePurchaseWithSOL()
    } else {
      handlePurchaseWithUSDC()
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
                Pay with SOL or USDC • 1 CHESS = $0.01 USD
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
                className={`cursor-pointer transition-all border-2 ${
                  paymentMethod === 'SOL'
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={() => !processingTx && setPaymentMethod('SOL')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">◎</span>
                  </div>
                  <div className="text-white font-semibold">Pay with SOL</div>
                  <div className="text-xs text-slate-400 mt-1">
                    1 SOL ≈ ${solPrice.toFixed(0)}
                  </div>
                  {paymentMethod === 'SOL' && (
                    <Badge className="mt-2 bg-purple-500">Selected</Badge>
                  )}
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-2 ${
                  paymentMethod === 'USDC'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={() => !processingTx && setPaymentMethod('USDC')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-white font-semibold">Pay with USDC</div>
                  <div className="text-xs text-slate-400 mt-1">
                    1 USDC = $1.00
                  </div>
                  {paymentMethod === 'USDC' && (
                    <Badge className="mt-2 bg-blue-500">Selected</Badge>
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
                      {paymentAmountDisplay} {paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Payment to:</span>
                    <span className="text-slate-400">
                      {TREASURY_WALLET.slice(0, 6)}...{TREASURY_WALLET.slice(-6)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={loading || processingTx || !tokenAmount || parseFloat(tokenAmount) < 100 || !publicKey}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold h-12 text-lg"
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
                  <li>You send SOL/USDC to our treasury wallet</li>
                  <li>Transaction is verified on Solana blockchain</li>
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