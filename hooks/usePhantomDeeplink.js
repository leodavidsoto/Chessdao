'use client'

import { useState, useCallback, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

// Phantom Universal Link (works on Android/iOS)
const PHANTOM_CONNECT_URL = 'https://phantom.app/ul/v1/connect'

// The web app URL - Phantom will redirect back here after connecting
const APP_URL = 'https://chessdao-production.up.railway.app'

// Get or create persistent keypair for encryption
function getOrCreateKeypair() {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem('dapp_keypair')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      return {
        publicKey: new Uint8Array(parsed.publicKey),
        secretKey: new Uint8Array(parsed.secretKey)
      }
    } catch (e) {
      console.error('Error parsing stored keypair:', e)
    }
  }

  // Generate new keypair and store it
  const keypair = nacl.box.keyPair()
  localStorage.setItem('dapp_keypair', JSON.stringify({
    publicKey: Array.from(keypair.publicKey),
    secretKey: Array.from(keypair.secretKey)
  }))
  return keypair
}

export function usePhantomDeeplink() {
  const [publicKey, setPublicKey] = useState(null)
  const [session, setSession] = useState(null)
  const [dappKeyPair, setDappKeyPair] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState(null)

  // Initialize on mount
  useEffect(() => {
    setMounted(true)
    const keypair = getOrCreateKeypair()
    setDappKeyPair(keypair)

    // Check for stored connection
    const storedPubkey = localStorage.getItem('phantom_pubkey')
    if (storedPubkey) {
      try {
        setPublicKey(new PublicKey(storedPubkey))
        setSession(localStorage.getItem('phantom_session'))
      } catch (e) {
        console.error('Invalid stored pubkey:', e)
        localStorage.removeItem('phantom_pubkey')
      }
    }
  }, [])

  // Handle deeplink response from Phantom
  useEffect(() => {
    if (!mounted || !dappKeyPair) return

    const href = window.location.href
    const queryStart = href.indexOf('?')
    if (queryStart === -1) return

    const params = new URLSearchParams(href.substring(queryStart))

    // Check for Phantom connect response
    const phantomEncPubkey = params.get('phantom_encryption_public_key')
    const nonce = params.get('nonce')
    const data = params.get('data')

    if (phantomEncPubkey && nonce && data) {
      console.log('📱 Received Phantom response, decrypting...')
      try {
        const phantomPubkeyBytes = bs58.decode(phantomEncPubkey)
        const nonceBytes = bs58.decode(nonce)
        const dataBytes = bs58.decode(data)

        // Create shared secret
        const sharedSecret = nacl.box.before(phantomPubkeyBytes, dappKeyPair.secretKey)

        // Decrypt
        const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret)

        if (decrypted) {
          const response = JSON.parse(new TextDecoder().decode(decrypted))
          console.log('📱 Phantom response:', response)

          if (response.public_key) {
            const pubkey = new PublicKey(response.public_key)
            setPublicKey(pubkey)
            setSession(response.session)
            setConnecting(false)
            setError(null)

            // Store connection
            localStorage.setItem('phantom_pubkey', response.public_key)
            if (response.session) {
              localStorage.setItem('phantom_session', response.session)
            }

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname)
          }
        } else {
          console.error('❌ Failed to decrypt Phantom response')
          setError('Error al descifrar respuesta de Phantom')
        }
      } catch (e) {
        console.error('❌ Error processing Phantom response:', e)
        setError('Error procesando respuesta de Phantom')
      }
      setConnecting(false)
    }

    // Check for error response
    const errorCode = params.get('errorCode')
    if (errorCode) {
      console.error('❌ Phantom error:', errorCode, params.get('errorMessage'))
      setError(params.get('errorMessage') || 'Error de conexión con Phantom')
      setConnecting(false)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [mounted, dappKeyPair])

  // Connect to Phantom wallet
  const connect = useCallback(() => {
    if (!dappKeyPair) {
      console.error('Keypair not ready')
      setError('Sistema no listo. Intenta de nuevo.')
      return
    }

    setConnecting(true)
    setError(null)

    // Get the current URL to use as redirect (web URL, not deeplink scheme)
    const currentUrl = typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : APP_URL

    // Build connect URL with web redirect
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      cluster: 'devnet',
      app_url: APP_URL,
      redirect_link: currentUrl, // Redirect back to this web page
    })

    const url = `${PHANTOM_CONNECT_URL}?${params.toString()}`
    console.log('📱 Connecting to Phantom:', url)

    // Try to open Phantom
    // The universal link will open Phantom if installed, or the website if not
    window.location.href = url
  }, [dappKeyPair])

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setPublicKey(null)
    setSession(null)
    setConnecting(false)
    setError(null)
    localStorage.removeItem('phantom_pubkey')
    localStorage.removeItem('phantom_session')
  }, [])

  return {
    publicKey,
    session,
    connected: !!publicKey,
    connecting,
    error,
    connect,
    disconnect,
  }
}
