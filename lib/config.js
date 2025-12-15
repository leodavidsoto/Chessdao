// Centralized configuration for API and WebSocket URLs

export const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side: use relative URLs
    return ''
  }

  // Client-side: check for environment variable first (for mobile/production)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Fallback to current origin (for web development)
  return window.location.origin
}

export const getWsUrl = () => {
  if (typeof window === 'undefined') return ''

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL
  }

  return window.location.origin
}

export const config = {
  get apiUrl() { return getBaseUrl() },
  get wsUrl() { return getWsUrl() },
  solanaNetwork: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
  solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
}

// Helper function for API calls that works both in web and mobile
export const apiFetch = async (endpoint, options = {}) => {
  const baseUrl = getBaseUrl()
  // If endpoint starts with /, prepend the base URL
  const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : endpoint

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  return response
}

// JSON API call helper
export const apiCall = async (endpoint, options = {}) => {
  const response = await apiFetch(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

export default config
