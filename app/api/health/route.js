import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017"

export async function GET() {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            api: 'healthy',
            mongodb: 'checking...',
            solana: 'configured'
        }
    }

    // Check MongoDB connection
    try {
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 3000
        })
        await client.connect()
        await client.db('dao_chess').command({ ping: 1 })
        await client.close()
        health.services.mongodb = 'healthy'
    } catch (error) {
        health.services.mongodb = 'unhealthy'
        health.mongoError = error.message
        health.status = 'degraded'
    }

    // Add Solana network info
    health.solana = {
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    }

    const statusCode = health.status === 'ok' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
}
