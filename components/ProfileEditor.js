'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    User,
    Check,
    X,
    Sparkles,
    Globe
} from 'lucide-react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { toast } from 'sonner'

// Available avatars
const AVATARS = [
    '♟️', '♞', '♝', '♜', '♛', '♚',
    '🏰', '⚔️', '👑', '🎮', '🎯', '🔥',
    '💎', '⭐', '🌟', '💀', '🐉', '🦁'
]

// Countries
const COUNTRIES = [
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'MX', name: 'México', flag: '🇲🇽' },
    { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'US', name: 'USA', flag: '🇺🇸' },
    { code: 'GB', name: 'UK', flag: '🇬🇧' },
    { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹' },
    { code: 'RU', name: 'Rusia', flag: '🇷🇺' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'JP', name: 'Japón', flag: '🇯🇵' },
]

export default function ProfileEditor({ onClose, isNewUser }) {
    const { publicKey } = useWallet()
    const { profile, actions: { saveProfile } } = useUserProfile()

    const [formData, setFormData] = useState({
        username: '',
        displayName: '',
        avatar: '♟️',
        bio: '',
        country: ''
    })
    const [saving, setSaving] = useState(false)
    const [usernameError, setUsernameError] = useState('')
    const [showAvatarPicker, setShowAvatarPicker] = useState(false)

    // Load existing profile data
    useEffect(() => {
        if (profile?.profile) {
            setFormData({
                username: profile.profile.username || '',
                displayName: profile.profile.displayName || '',
                avatar: profile.profile.avatar || '♟️',
                bio: profile.profile.bio || '',
                country: profile.profile.country || ''
            })
        }
    }, [profile])

    // Validate username
    const validateUsername = (value) => {
        if (value.length < 3) {
            setUsernameError('Mínimo 3 caracteres')
            return false
        }
        if (value.length > 20) {
            setUsernameError('Máximo 20 caracteres')
            return false
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            setUsernameError('Solo letras, números y _')
            return false
        }
        setUsernameError('')
        return true
    }

    const handleUsernameChange = (e) => {
        const value = e.target.value
        setFormData(prev => ({ ...prev, username: value }))
        if (value) validateUsername(value)
    }

    const handleSave = async () => {
        if (!validateUsername(formData.username)) {
            return
        }

        setSaving(true)

        try {
            const result = await saveProfile({
                username: formData.username,
                displayName: formData.displayName || formData.username,
                avatar: formData.avatar,
                bio: formData.bio,
                country: formData.country
            })

            if (result.success) {
                toast.success(isNewUser ? '¡Perfil creado!' : 'Perfil actualizado')
                onClose()
            } else {
                toast.error(result.error || 'Error al guardar')
            }
        } catch (error) {
            toast.error('Error al guardar perfil')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <User className="h-6 w-6 text-purple-400" />
                            {isNewUser ? 'Crear Perfil' : 'Editar Perfil'}
                        </CardTitle>
                        {!isNewUser && (
                            <Button variant="ghost" onClick={onClose} className="text-slate-400">
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                    {isNewUser && (
                        <p className="text-sm text-slate-400">
                            ¡Bienvenido a ChessDAO! Configura tu perfil para empezar a jugar.
                        </p>
                    )}
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Avatar Selection */}
                    <div>
                        <Label className="text-slate-300 mb-2 block">Avatar</Label>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-4xl hover:scale-105 transition-transform border-4 border-purple-400/50"
                            >
                                {formData.avatar}
                            </button>
                            <div className="flex-1">
                                <p className="text-sm text-slate-400">
                                    Click para cambiar tu avatar
                                </p>
                            </div>
                        </div>

                        {showAvatarPicker && (
                            <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                                <div className="grid grid-cols-6 gap-2">
                                    {AVATARS.map(avatar => (
                                        <button
                                            key={avatar}
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, avatar }))
                                                setShowAvatarPicker(false)
                                            }}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl hover:bg-slate-600 transition-colors ${formData.avatar === avatar ? 'bg-purple-600' : 'bg-slate-700'
                                                }`}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Username */}
                    <div>
                        <Label htmlFor="username" className="text-slate-300">
                            Username *
                        </Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={handleUsernameChange}
                            placeholder="tu_nombre_de_usuario"
                            className="mt-1 bg-slate-700 border-slate-600 text-white"
                        />
                        {usernameError && (
                            <p className="text-xs text-red-400 mt-1">{usernameError}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                            3-20 caracteres. Solo letras, números y _
                        </p>
                    </div>

                    {/* Display Name */}
                    <div>
                        <Label htmlFor="displayName" className="text-slate-300">
                            Nombre para mostrar
                        </Label>
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                            placeholder="Tu Nombre"
                            className="mt-1 bg-slate-700 border-slate-600 text-white"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <Label htmlFor="bio" className="text-slate-300 flex items-center justify-between">
                            <span>Bio</span>
                            <span className="text-xs text-slate-500">{formData.bio.length}/160</span>
                        </Label>
                        <textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => {
                                if (e.target.value.length <= 160) {
                                    setFormData(prev => ({ ...prev, bio: e.target.value }))
                                }
                            }}
                            placeholder="Cuéntanos sobre ti..."
                            rows={3}
                            className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Country */}
                    <div>
                        <Label htmlFor="country" className="text-slate-300 flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            País
                        </Label>
                        <select
                            id="country"
                            value={formData.country}
                            onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                            className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Selecciona tu país</option>
                            {COUNTRIES.map(country => (
                                <option key={country.code} value={country.code}>
                                    {country.flag} {country.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Preview */}
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-xs text-slate-400 mb-2">Vista previa</p>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl">
                                {formData.avatar}
                            </div>
                            <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                    {formData.displayName || formData.username || 'Tu nombre'}
                                    {formData.country && (
                                        <span>{COUNTRIES.find(c => c.code === formData.country)?.flag}</span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-400">
                                    @{formData.username || 'username'}
                                </div>
                            </div>
                        </div>
                        {formData.bio && (
                            <p className="text-sm text-slate-300 mt-2">{formData.bio}</p>
                        )}
                    </div>

                    {/* New user bonus */}
                    {isNewUser && (
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3">
                            <Sparkles className="h-8 w-8 text-yellow-400" />
                            <div>
                                <p className="font-semibold text-yellow-400">¡Bono de bienvenida!</p>
                                <p className="text-sm text-slate-300">
                                    Recibirás 500 $GAME al crear tu perfil
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!isNewUser && (
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 border-slate-600"
                            >
                                Cancelar
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={saving || !formData.username || !!usernameError}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    {isNewUser ? 'Crear Perfil' : 'Guardar Cambios'}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
