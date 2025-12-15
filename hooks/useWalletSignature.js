'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

/**
 * Hook para manejar firmas de wallet en acciones importantes
 * Requiere que el usuario firme con Phantom antes de acciones críticas
 */
export function useWalletSignature() {
    const { publicKey, connected, signMessage } = useWallet()
    const [isSigning, setIsSigning] = useState(false)
    const [lastSignature, setLastSignature] = useState(null)
    const [error, setError] = useState(null)

    // Mensajes descriptivos por tipo de acción
    const ACTION_MESSAGES = {
        START_GAME_BET: (data) =>
            `Confirmar inicio de partida con apuesta de ${data?.amount || 0} CHESS tokens.\n\nWallet: ${publicKey?.toString()?.slice(0, 8)}...\nFecha: ${new Date().toISOString()}`,

        BUY_TOKENS: (data) =>
            `Confirmar compra de ${data?.amount || 0} CHESS tokens.\n\nWallet: ${publicKey?.toString()?.slice(0, 8)}...\nFecha: ${new Date().toISOString()}`,

        OPEN_LOOTBOX: (data) =>
            `Confirmar apertura de Loot Box ${data?.type || 'Normal'}.\nCosto: ${data?.cost || 0} CHESS tokens.\n\nWallet: ${publicKey?.toString()?.slice(0, 8)}...\nFecha: ${new Date().toISOString()}`,

        SEND_CHALLENGE: (data) =>
            `Enviar desafío a ${data?.opponent || 'oponente'}.\nApuesta: ${data?.amount || 0} CHESS tokens.\n\nWallet: ${publicKey?.toString()?.slice(0, 8)}...\nFecha: ${new Date().toISOString()}`,

        TRANSFER_TOKENS: (data) =>
            `Transferir ${data?.amount || 0} CHESS tokens a ${data?.recipient?.slice(0, 8) || 'destinatario'}...\n\nWallet: ${publicKey?.toString()?.slice(0, 8)}...\nFecha: ${new Date().toISOString()}`,

        GENERIC: (data) =>
            `Confirmar acción en ChessDAO.\n\nWallet: ${publicKey?.toString()?.slice(0, 8)}...\nFecha: ${new Date().toISOString()}`
    }

    /**
     * Solicita firma del usuario para una acción específica
     * @param {string} actionType - Tipo de acción (ver ACTION_MESSAGES)
     * @param {object} data - Datos adicionales para el mensaje
     * @returns {object|null} - { signature, message } o null si falla/cancela
     */
    const signAction = useCallback(async (actionType, data = {}) => {
        console.log('🔐 signAction called:', { actionType, data, connected, publicKey: publicKey?.toString(), hasSignMessage: typeof signMessage === 'function' })

        if (!connected || !publicKey) {
            console.error('❌ Wallet not connected')
            setError('Wallet no conectada. Por favor conecta tu wallet primero.')
            return null
        }

        if (typeof signMessage !== 'function') {
            console.error('❌ signMessage is not a function:', signMessage)
            setError('Tu wallet no soporta firma de mensajes. Por favor usa Phantom.')
            return null
        }

        setIsSigning(true)
        setError(null)

        try {
            // Generar mensaje descriptivo
            const messageGenerator = ACTION_MESSAGES[actionType] || ACTION_MESSAGES.GENERIC
            const message = messageGenerator(data)

            console.log(`🔐 Solicitando firma para: ${actionType}`)
            console.log(`📝 Mensaje:`, message)

            // Codificar mensaje para firma
            const encodedMessage = new TextEncoder().encode(message)

            console.log('📤 Calling signMessage...')

            let signature

            // Usar API directa de Phantom para SIEMPRE mostrar el popup de firma
            // (el wallet adapter puede auto-aprobar en sitios de confianza)
            const phantomProvider = window?.phantom?.solana || window?.solana

            if (phantomProvider?.isPhantom && phantomProvider?.signMessage) {
                console.log('🔐 Usando API directa de Phantom para forzar popup...')
                // La API directa de Phantom siempre muestra el popup
                const { signature: phantomSig } = await phantomProvider.signMessage(encodedMessage, 'utf8')
                signature = phantomSig
            } else if (typeof signMessage === 'function') {
                // Fallback al wallet adapter para otras wallets
                console.log('🔐 Usando wallet adapter signMessage...')
                signature = await signMessage(encodedMessage)
            } else {
                throw new Error('No se encontró método de firma disponible')
            }

            console.log('✅ signMessage returned:', signature)

            // Convertir firma a base58 para almacenamiento
            const signatureBase58 = Buffer.from(signature).toString('base64')

            console.log(`✅ Firma obtenida: ${signatureBase58.slice(0, 20)}...`)

            setLastSignature({
                signature: signatureBase58,
                message,
                actionType,
                timestamp: new Date().toISOString(),
                wallet: publicKey.toString()
            })

            setIsSigning(false)
            return {
                signature: signatureBase58,
                message,
                valid: true
            }

        } catch (err) {
            console.error('❌ Error al firmar:', err)
            console.error('Error name:', err.name)
            console.error('Error message:', err.message)
            console.error('Error code:', err.code)

            // Detectar si el usuario canceló
            if (err.message?.includes('User rejected') ||
                err.message?.includes('cancelled') ||
                err.message?.includes('rejected') ||
                err.code === 4001) {
                setError('Firma cancelada por el usuario')
            } else {
                setError(err.message || 'Error al solicitar firma')
            }

            setIsSigning(false)
            return null
        }
    }, [connected, publicKey, signMessage])

    /**
     * Verifica que el usuario controla la wallet (firma simple)
     */
    const verifyOwnership = useCallback(async () => {
        return signAction('GENERIC', {})
    }, [signAction])

    /**
     * Limpia el estado de error
     */
    const clearError = useCallback(() => {
        setError(null)
    }, [])

    return {
        signAction,
        verifyOwnership,
        isSigning,
        lastSignature,
        error,
        clearError,
        isWalletReady: connected && !!signMessage
    }
}
