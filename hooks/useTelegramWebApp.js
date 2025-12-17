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

    return {
        isInTelegram,
        isReady,
        telegramUser,
        webApp,
        actions: {
            showMainButton,
            hideMainButton,
            showAlert,
            showConfirm,
            close,
            hapticFeedback,
        }
    }
}
