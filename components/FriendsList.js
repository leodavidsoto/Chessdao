'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Users,
    Search,
    UserPlus,
    UserMinus,
    Swords,
    MessageCircle,
    Check,
    X,
    ChevronDown,
    Loader2
} from 'lucide-react'
import { useFriends } from '@/hooks/useFriends'
import { toast } from 'sonner'

export default function FriendsList({ onClose, onChallenge }) {
    const { publicKey } = useWallet()
    const {
        friends,
        followers,
        following,
        pendingIncoming,
        pendingSent,
        onlineFriends,
        loading,
        actions
    } = useFriends()

    const [activeTab, setActiveTab] = useState('friends') // friends, followers, following, requests
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [showSearch, setShowSearch] = useState(false)

    // Search users
    const handleSearch = async () => {
        if (!searchQuery || searchQuery.length < 2) return

        setSearching(true)
        try {
            const res = await fetch(
                `/api/user/search?q=${encodeURIComponent(searchQuery)}&exclude=${publicKey.toString()}`
            )
            const data = await res.json()
            setSearchResults(data.results || [])
        } catch (error) {
            console.error('Search error:', error)
            toast.error('Error al buscar')
        } finally {
            setSearching(false)
        }
    }

    // Handle friend request
    const handleSendRequest = async (wallet, type = 'friend') => {
        const result = await actions.sendFriendRequest(wallet, type)
        if (result.success) {
            toast.success(type === 'friend' ? 'Solicitud enviada' : 'Ahora sigues a este usuario')
            setSearchResults(prev => prev.filter(u => u.walletAddress !== wallet))
        } else {
            toast.error(result.error)
        }
    }

    // Handle accept/decline
    const handleAcceptRequest = async (friendshipId) => {
        const result = await actions.acceptRequest(friendshipId)
        if (result.success) {
            toast.success('Solicitud aceptada')
        } else {
            toast.error(result.error)
        }
    }

    const handleDeclineRequest = async (friendshipId) => {
        const result = await actions.declineRequest(friendshipId)
        if (result.success) {
            toast.success('Solicitud rechazada')
        } else {
            toast.error(result.error)
        }
    }

    // Render user card
    const UserCard = ({ user, type, friendshipId }) => (
        <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 transition-colors">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl">
                        {user.avatar || '♟️'}
                    </div>
                    {user.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                    )}
                </div>
                <div>
                    <div className="font-medium text-white flex items-center gap-2">
                        {user.username || user.displayName}
                        {user.country && (
                            <span className="text-sm">{getCountryFlag(user.country)}</span>
                        )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>⭐ {user.rating || 1200}</span>
                        {user.gamesPlayed > 0 && <span>• {user.gamesPlayed} games</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {type === 'friend' && (
                    <>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onChallenge?.(user)}
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/30"
                        >
                            <Swords className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                        >
                            <MessageCircle className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {type === 'search' && (
                    <>
                        {user.friendship ? (
                            <Badge variant="outline" className="text-slate-400">
                                {user.friendship.status === 'pending' ? 'Pendiente' :
                                    user.friendship.type === 'friend' ? 'Amigo' : 'Siguiendo'}
                            </Badge>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => handleSendRequest(user.walletAddress, 'friend')}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Añadir
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSendRequest(user.walletAddress, 'follow')}
                                    className="text-blue-400"
                                >
                                    Seguir
                                </Button>
                            </>
                        )}
                    </>
                )}

                {type === 'request' && (
                    <>
                        <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(friendshipId)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeclineRequest(friendshipId)}
                            className="text-red-400 hover:bg-red-900/30"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {type === 'follower' && !friends.find(f => f.walletAddress === user.walletAddress) && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendRequest(user.walletAddress, 'friend')}
                        className="border-purple-500 text-purple-400"
                    >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Añadir
                    </Button>
                )}
            </div>
        </div>
    )

    const tabs = [
        { id: 'friends', label: 'Amigos', count: friends.length },
        { id: 'followers', label: 'Seguidores', count: followers.length },
        { id: 'following', label: 'Siguiendo', count: following.length },
        { id: 'requests', label: 'Solicitudes', count: pendingIncoming.length, highlight: pendingIncoming.length > 0 }
    ]

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 max-w-2xl w-full shadow-2xl max-h-[85vh] flex flex-col">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Users className="h-6 w-6 text-green-400" />
                            Amigos y Seguidores
                        </CardTitle>
                        <Button variant="ghost" onClick={onClose} className="text-slate-400">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Buscar usuarios..."
                                className="pl-10 bg-slate-700 border-slate-600 text-white"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={searching || searchQuery.length < 2}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-3 bg-slate-700/50 p-1 rounded-lg">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    setSearchResults([])
                                }}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-purple-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <Badge
                                        variant={tab.highlight ? 'default' : 'secondary'}
                                        className={`ml-1 h-5 min-w-5 ${tab.highlight ? 'bg-red-500' : ''}`}
                                    >
                                        {tab.count}
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto">
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 mb-2">
                                Resultados de búsqueda ({searchResults.length})
                            </h3>
                            <div className="space-y-2">
                                {searchResults.map(user => (
                                    <UserCard
                                        key={user.walletAddress}
                                        user={user}
                                        type="search"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content based on tab */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'friends' && (
                                <div className="space-y-2">
                                    {onlineFriends.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="text-xs font-semibold text-green-400 mb-2 uppercase">
                                                🟢 Online ({onlineFriends.length})
                                            </h3>
                                            {onlineFriends.map(friend => (
                                                <UserCard
                                                    key={friend.walletAddress}
                                                    user={friend}
                                                    type="friend"
                                                    friendshipId={friend.friendshipId}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {friends.filter(f => !f.isOnline).length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                                                Offline ({friends.filter(f => !f.isOnline).length})
                                            </h3>
                                            {friends.filter(f => !f.isOnline).map(friend => (
                                                <UserCard
                                                    key={friend.walletAddress}
                                                    user={friend}
                                                    type="friend"
                                                    friendshipId={friend.friendshipId}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {friends.length === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>No tienes amigos aún</p>
                                            <p className="text-sm mt-1">Usa la búsqueda para encontrar jugadores</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'followers' && (
                                <div className="space-y-2">
                                    {followers.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>Nadie te sigue aún</p>
                                        </div>
                                    ) : (
                                        followers.map(user => (
                                            <UserCard
                                                key={user.walletAddress}
                                                user={user}
                                                type="follower"
                                            />
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'following' && (
                                <div className="space-y-2">
                                    {following.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>No sigues a nadie</p>
                                        </div>
                                    ) : (
                                        following.map(user => (
                                            <UserCard
                                                key={user.walletAddress}
                                                user={user}
                                                type="following"
                                            />
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'requests' && (
                                <div className="space-y-4">
                                    {pendingIncoming.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">
                                                Solicitudes recibidas
                                            </h3>
                                            <div className="space-y-2">
                                                {pendingIncoming.map(request => (
                                                    <UserCard
                                                        key={request.friendshipId}
                                                        user={request}
                                                        type="request"
                                                        friendshipId={request.friendshipId}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pendingSent.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">
                                                Solicitudes enviadas
                                            </h3>
                                            <div className="space-y-2">
                                                {pendingSent.map(request => (
                                                    <div
                                                        key={request.friendshipId}
                                                        className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-xl">
                                                                {request.avatar || '♟️'}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-white">{request.username}</div>
                                                                <div className="text-xs text-slate-400">Pendiente</div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                                                            Esperando respuesta
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pendingIncoming.length === 0 && pendingSent.length === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>No hay solicitudes pendientes</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

// Helper function
function getCountryFlag(code) {
    const flags = {
        CL: '🇨🇱', AR: '🇦🇷', MX: '🇲🇽', ES: '🇪🇸', CO: '🇨🇴',
        PE: '🇵🇪', BR: '🇧🇷', US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪',
        FR: '🇫🇷', IT: '🇮🇹', RU: '🇷🇺', IN: '🇮🇳', CN: '🇨🇳', JP: '🇯🇵'
    }
    return flags[code] || ''
}
