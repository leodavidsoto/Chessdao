import { NextResponse } from 'next/server'

/**
 * Simple health check endpoint for Railway
 * Always returns 200 OK to pass healthchecks
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    }, { status: 200 })
}
