import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

/**
 * GET /api/analytics/kfactor
 * Calculate K-Factor for viral growth
 * K = invites_sent × conversion_rate
 * Goal: K > 1 = exponential growth
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const walletAddress = searchParams.get('wallet') // Optional: for user-specific stats

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        // Base query
        const dateQuery = { createdAt: { $gte: cutoffDate } }

        // Get referral stats
        let referralQuery = dateQuery
        if (walletAddress) {
            referralQuery = { ...dateQuery, referrerWallet: walletAddress }
        }

        // Count referrals (invites converted)
        const totalReferrals = await db.collection('referrals').countDocuments(referralQuery)

        // Count premium referrals
        const premiumReferrals = await db.collection('referrals').countDocuments({
            ...referralQuery,
            isPremium: true
        })

        // Get unique referrers (users who invited at least 1 person)
        const uniqueReferrers = await db.collection('referrals').distinct(
            'referrerWallet',
            referralQuery
        )

        // Get total active users who have referral codes
        const totalUsersWithCodes = await db.collection('users').countDocuments({
            referralCode: { $exists: true, $ne: null },
            createdAt: { $gte: cutoffDate }
        })

        // Estimate invites sent (assume each user with code sent ~3 invites on average)
        // In production, track actual share events
        const estimatedInvitesSent = totalUsersWithCodes * 3

        // Calculate K-Factor
        const conversionRate = estimatedInvitesSent > 0
            ? totalReferrals / estimatedInvitesSent
            : 0

        // Average invites per user
        const avgInvitesPerUser = totalUsersWithCodes > 0
            ? estimatedInvitesSent / totalUsersWithCodes
            : 0

        // K = i × c
        const kFactor = avgInvitesPerUser * conversionRate

        // Get top referrers
        const topReferrers = await db.collection('users')
            .find({ referralCount: { $gt: 0 } })
            .sort({ referralCount: -1 })
            .limit(10)
            .project({
                username: 1,
                referralCount: 1,
                referralEarnings: 1
            })
            .toArray()

        // Daily breakdown for chart
        const dailyStats = await db.collection('referrals').aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    premiumCount: {
                        $sum: { $cond: ['$isPremium', 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray()

        await client.close()

        return NextResponse.json({
            period: `${days} days`,
            kFactor: Math.round(kFactor * 1000) / 1000,
            kFactorStatus: kFactor >= 1 ? 'viral' : kFactor >= 0.5 ? 'growing' : 'declining',
            metrics: {
                totalReferrals,
                premiumReferrals,
                uniqueReferrers: uniqueReferrers.length,
                estimatedInvitesSent,
                conversionRate: Math.round(conversionRate * 10000) / 100, // As percentage
                avgInvitesPerUser: Math.round(avgInvitesPerUser * 10) / 10
            },
            topReferrers: topReferrers.map(r => ({
                username: r.username || 'Anonymous',
                referrals: r.referralCount,
                earnings: r.referralEarnings
            })),
            dailyStats: dailyStats.map(d => ({
                date: d._id,
                referrals: d.count,
                premium: d.premiumCount
            })),
            goal: 'K > 1 = exponential growth without paid ads'
        })

    } catch (error) {
        console.error('K-Factor API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/analytics/kfactor
 * Track share event (when user shares invite)
 * Body: { walletAddress, shareType, platform }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { walletAddress, shareType, platform } = body

        if (!walletAddress) {
            return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        const now = new Date()

        // Track share event
        await db.collection('share_events').insertOne({
            walletAddress,
            shareType: shareType || 'invite', // invite, victory, levelUp, streak
            platform: platform || 'telegram', // telegram, story, clipboard, web
            createdAt: now
        })

        // Update user's invite count
        await db.collection('users').updateOne(
            { walletAddress },
            {
                $inc: { invitesSent: 1 },
                $set: { lastShareAt: now }
            }
        )

        await client.close()

        return NextResponse.json({
            success: true,
            message: 'Share tracked'
        })

    } catch (error) {
        console.error('Share track error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
