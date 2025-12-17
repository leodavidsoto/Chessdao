'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook para detectar y manejar Telegram WebApp
 * Detecta si la app está corriendo dentro de Telegram y proporciona
 * funciones para interactuar con el Telegram WebApp SDK
 */
export function useTelegramWebApp() {
    const [isInTelegram, setIsInTelegram] = useState(false)
    const [telegramUser, setTelegramUser] = useState(null)
    const [webApp, setWebApp] = useState(null)
    const [isReady, setIsReady] = useState(false)
    const [startParam, setStartParam] = useState(null)

    useEffect(() => {
        if (typeof window === 'undefined') return

        // Check if we're inside Telegram WebApp
        const tg = window.Telegram?.WebApp

        if (tg) {
            console.log('🔵 Running inside Telegram WebApp')
            setIsInTelegram(true)
            setWebApp(tg)

            // Initialize Telegram WebApp
            tg.ready()
            tg.expand() // Expand to full height

            // Get user info
            if (tg.initDataUnsafe?.user) {
                setTelegramUser({
                    id: tg.initDataUnsafe.user.id,
                    firstName: tg.initDataUnsafe.user.first_name,
                    lastName: tg.initDataUnsafe.user.last_name || '',
                    username: tg.initDataUnsafe.user.username || '',
                    languageCode: tg.initDataUnsafe.user.language_code || 'en',
                    isPremium: tg.initDataUnsafe.user.is_premium || false
                })
            }

            // Extract startapp parameter (for referrals)
            // Format: REF_XXXXXX for referral codes
            if (tg.initDataUnsafe?.start_param) {
                const param = tg.initDataUnsafe.start_param
                console.log('🎫 Start param detected:', param)
                setStartParam(param)
            }

            // Set theme colors to match app
            tg.setHeaderColor('#0f172a') // slate-900
            tg.setBackgroundColor('#0f172a')

            setIsReady(true)
        } else {
            console.log('🌐 Running in regular browser')
            setIsInTelegram(false)
            setIsReady(true)
        }
    }, [])

    // Show main button
    const showMainButton = useCallback((text, callback) => {
        if (webApp?.MainButton) {
            webApp.MainButton.text = text
            webApp.MainButton.show()
            webApp.MainButton.onClick(callback)
        }
    }, [webApp])

    // Hide main button
    const hideMainButton = useCallback(() => {
        if (webApp?.MainButton) {
            webApp.MainButton.hide()
        }
    }, [webApp])

    // Show alert
    const showAlert = useCallback((message) => {
        if (webApp) {
            webApp.showAlert(message)
        } else {
            alert(message)
        }
    }, [webApp])

    // Show confirm
    const showConfirm = useCallback((message, callback) => {
        if (webApp) {
            webApp.showConfirm(message, callback)
        } else {
            callback(confirm(message))
        }
    }, [webApp])

    // Close webapp
    const close = useCallback(() => {
        if (webApp) {
            webApp.close()
        }
    }, [webApp])

    // Haptic feedback
    const hapticFeedback = useCallback((type = 'light') => {
        if (webApp?.HapticFeedback) {
            switch (type) {
                case 'light':
                    webApp.HapticFeedback.impactOccurred('light')
                    break
                case 'medium':
                    webApp.HapticFeedback.impactOccurred('medium')
                    break
                case 'heavy':
                    webApp.HapticFeedback.impactOccurred('heavy')
                    break
                case 'success':
                    webApp.HapticFeedback.notificationOccurred('success')
                    break
                case 'error':
                    webApp.HapticFeedback.notificationOccurred('error')
                    break
            }
        }
    }, [webApp])

    // Share to Telegram Stories (v7.8+)
    const shareToStory = useCallback(async (mediaUrl, params = {}) => {
        if (webApp?.shareToStory) {
            try {
                await webApp.shareToStory(mediaUrl, params)
                return true
            } catch (err) {
                console.error('Story share error:', err)
                return false
            }
        }
        return false
    }, [webApp])

    // Open Telegram link
    const openLink = useCallback((url, options = {}) => {
        if (webApp?.openLink) {
            webApp.openLink(url, options)
        } else if (webApp?.openTelegramLink && url.includes('t.me')) {
            webApp.openTelegramLink(url)
        } else {
            window.open(url, '_blank')
        }
    }, [webApp])

    // Share URL via Telegram
    const shareUrl = useCallback((url, text = '') => {
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        if (webApp?.openTelegramLink) {
            webApp.openTelegramLink(shareLink)
        } else {
            window.open(shareLink, '_blank')
        }
    }, [webApp])

    return {
        isInTelegram,
        isReady,
        telegramUser,
        webApp,
        startParam,
        // Helper to extract referral code from startParam
        referralCode: startParam?.startsWith('REF_') ? startParam.substring(4) : null,
        // Check if Stories are supported
        supportsStories: !!webApp?.shareToStory,
        actions: {
            showMainButton,
            hideMainButton,
            showAlert,
            showConfirm,
            close,
            hapticFeedback,
            shareToStory,
            openLink,
            shareUrl,
        }
    }
}


