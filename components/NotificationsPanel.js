'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Bell,
    Check,
    CheckCheck,
    X,
    UserPlus,
    Swords,
    Trophy,
    MessageCircle,
    Settings,
    Sparkles,
    Clock,
    Loader2
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NotificationsPanel({ onClose }) {
    const {
        notifications,
        unreadCount,
        loading,
        actions: { markAsRead, markAllAsRead, dismiss }
    } = useNotifications()

    const [markingAll, setMarkingAll] = useState(false)

    const handleMarkAllRead = async () => {
        setMarkingAll(true)
        await markAllAsRead()
        setMarkingAll(false)
    }

    // Get icon based on notification type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'friend_request':
            case 'friend_accepted':
            case 'new_follower':
                return <UserPlus className="h-5 w-5 text-blue-400" />
            case 'challenge':
            case 'challenge_accepted':
            case 'challenge_declined':
                return <Swords className="h-5 w-5 text-orange-400" />
            case 'game_result':
                return <Trophy className="h-5 w-5 text-yellow-400" />
            case 'message':
                return <MessageCircle className="h-5 w-5 text-green-400" />
            case 'achievement':
                return <Sparkles className="h-5 w-5 text-purple-400" />
            case 'system':
            default:
                return <Bell className="h-5 w-5 text-slate-400" />
        }
    }

    // Get background color based on type
    const getNotificationBg = (type, read) => {
        if (read) return 'bg-slate-700/30'

        switch (type) {
            case 'friend_request':
            case 'new_follower':
                return 'bg-blue-900/30 border-l-4 border-blue-500'
            case 'challenge':
                return 'bg-orange-900/30 border-l-4 border-orange-500'
            case 'challenge_accepted':
                return 'bg-green-900/30 border-l-4 border-green-500'
            case 'game_result':
                return 'bg-yellow-900/30 border-l-4 border-yellow-500'
            case 'achievement':
                return 'bg-purple-900/30 border-l-4 border-purple-500'
            default:
                return 'bg-slate-700/50 border-l-4 border-slate-500'
        }
    }

    // Format time
    const formatTime = (date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
        } catch {
            return ''
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Bell className="h-6 w-6 text-yellow-400" />
                            Notificaciones
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500 ml-2">{unreadCount}</Badge>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllRead}
                                    disabled={markingAll}
                                    className="text-slate-400 hover:text-white text-xs"
                                >
                                    {markingAll ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCheck className="h-4 w-4 mr-1" />
                                            Marcar todas
                                        </>
                                    )}
                                </Button>
                            )}
                            <Button variant="ghost" onClick={onClose} className="text-slate-400">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p>No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`rounded-lg p-3 transition-all hover:bg-slate-700/50 cursor-pointer ${getNotificationBg(notification.type, notification.read)
                                        }`}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className="flex-shrink-0 mt-0.5">
                                            {notification.fromUser?.avatar ? (
                                                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-lg">
                                                    {notification.fromUser.avatar}
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium text-white text-sm">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-sm text-slate-400 mt-0.5">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        dismiss(notification.id)
                                                    }}
                                                    className="flex-shrink-0 h-6 w-6 text-slate-500 hover:text-slate-300"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Challenge data */}
                                            {notification.type === 'challenge' && notification.data && (
                                                <div className="flex gap-2 mt-2">
                                                    <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                                                        ⏱️ {notification.data.timeControl}
                                                    </Badge>
                                                    {notification.data.betAmount > 0 && (
                                                        <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
                                                            🎮 {notification.data.betAmount} $GAME
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            {/* Time */}
                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                <Clock className="h-3 w-3" />
                                                {formatTime(notification.createdAt)}
                                                {!notification.read && (
                                                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                                        Nueva
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons for challenges */}
                                    {notification.type === 'challenge' && !notification.read && (
                                        <div className="flex gap-2 mt-3 ml-13">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1">
                                                <Check className="h-4 w-4 mr-1" />
                                                Aceptar
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-red-700 text-red-400 flex-1">
                                                <X className="h-4 w-4 mr-1" />
                                                Rechazar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Action buttons for friend requests */}
                                    {notification.type === 'friend_request' && !notification.read && (
                                        <div className="flex gap-2 mt-3 ml-13">
                                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 flex-1">
                                                <Check className="h-4 w-4 mr-1" />
                                                Aceptar
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-slate-600 flex-1">
                                                <X className="h-4 w-4 mr-1" />
                                                Ignorar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>

                {/* Footer */}
                <div className="p-3 border-t border-slate-700">
                    <Button
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white"
                        onClick={() => {/* Navigate to settings */ }}
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar notificaciones
                    </Button>
                </div>
            </Card>
        </div>
    )
}
