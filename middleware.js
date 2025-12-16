import { NextResponse } from 'next/server'

// Simple in-memory rate limiter
const rateLimitMap = new Map()

// Rate limit configuration by endpoint type
const RATE_LIMITS = {
  payment: { windowMs: 60000, maxRequests: 5 },   // 5 requests per minute for payments
  api: { windowMs: 60000, maxRequests: 100 },      // 100 requests per minute for general API
  default: { windowMs: 60000, maxRequests: 200 }   // 200 requests per minute default
}

function getRateLimitConfig(pathname) {
  if (pathname.includes('/api/payments')) {
    return RATE_LIMITS.payment
  }
  if (pathname.startsWith('/api/')) {
    return RATE_LIMITS.api
  }
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

  // Reset if window has passed
  if (now - record.startTime > config.windowMs) {
    rateLimitMap.set(key, { count: 1, startTime: now })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  // Check if over limit
  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.startTime + config.windowMs - now) / 1000) }
  }

  // Increment count
  record.count++
  return { allowed: true, remaining: config.maxRequests - record.count }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.startTime > 120000) { // 2 minutes
      rateLimitMap.delete(key)
    }
  }
}, 60000)

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Skip rate limiting for static files and health check
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/api/health' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Get client IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Check rate limit for API routes
  if (pathname.startsWith('/api/')) {
    const rateLimit = checkRateLimit(ip, pathname)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': '0'
          }
        }
      )
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
    return response
  }

  // Add security headers for all routes
  const response = NextResponse.next()

  // Security headers (compatible with wallet adapters)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
