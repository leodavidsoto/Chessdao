import { NextResponse } from 'next/server'

// ============================================================================
// Rate limiting (in-memory)
// ----------------------------------------------------------------------------
// NOTE: this limiter lives in a single process's memory. It is reset on every
// deploy and is not shared across multiple instances. For real DDoS protection
// in production, back it with Redis (or an edge/CDN rate limiter). It is kept
// here as a cheap first line of defense.
// ============================================================================

const rateLimitMap = new Map()

const RATE_LIMITS = {
  payment: { windowMs: 60000, maxRequests: 5 },   // 5/min for payments
  api: { windowMs: 60000, maxRequests: 100 },      // 100/min for general API
  default: { windowMs: 60000, maxRequests: 200 },  // 200/min default
}

function getRateLimitConfig(pathname) {
  if (pathname.includes('/api/payments')) return RATE_LIMITS.payment
  if (pathname.startsWith('/api/')) return RATE_LIMITS.api
  return RATE_LIMITS.default
}

function checkRateLimit(ip, pathname) {
  const config = getRateLimitConfig(pathname)
  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`
  const now = Date.now()

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, startTime: now })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  const record = rateLimitMap.get(key)

  if (now - record.startTime > config.windowMs) {
    rateLimitMap.set(key, { count: 1, startTime: now })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.startTime + config.windowMs - now) / 1000) }
  }

  record.count++
  return { allowed: true, remaining: config.maxRequests - record.count }
}

// Periodically evict stale entries so the map does not grow unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.startTime > 120000) rateLimitMap.delete(key)
  }
}, 60000)

// ============================================================================
// CORS (origin allowlist)
// ----------------------------------------------------------------------------
// Replaces the previous wildcard `Access-Control-Allow-Origin: *`. Only origins
// in ALLOWED_ORIGINS (comma-separated) may make cross-origin API calls with
// credentials. Requests without an Origin header (same-origin fetches, native
// mobile webviews, server-to-server) are always allowed.
// ============================================================================

function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const defaults = [
    process.env.NEXT_PUBLIC_API_URL,
    'http://localhost:3000',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost', // Capacitor Android/iOS webview
  ].filter(Boolean)

  return new Set([...configured, ...defaults])
}

function isOriginAllowed(origin) {
  if (!origin) return false
  return getAllowedOrigins().has(origin)
}

function applyCors(response, origin) {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  response.headers.set('Vary', 'Origin')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-wallet, x-signature, x-auth-message, x-oracle-key'
  )
  return response
}

function applySecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // Skip static assets and health check entirely.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/api/health' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const isApi = pathname.startsWith('/api/')

  // Preflight: answer CORS OPTIONS before doing anything else.
  if (isApi && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    return applyCors(preflight, origin)
  }

  if (isApi) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const rateLimit = checkRateLimit(ip, pathname)
    if (!rateLimit.allowed) {
      const res = NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
      return applyCors(applySecurityHeaders(res), origin)
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
    return applyCors(applySecurityHeaders(response), origin)
  }

  // Non-API routes: security headers only.
  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
