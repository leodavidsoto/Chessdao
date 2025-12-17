import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'chessdao'

// Reward constants
const REWARDS = {
    REFERRER_NORMAL: 500,        // Referrer gets 500 $GAME for normal user
    REFERRER_PREMIUM: 10000,     // Referrer gets 10,000 $GAME for Premium user
    INVITEE_WITH_CODE: 1000,     // Invitee gets 1,000 $GAME with referral code
    INVITEE_NO_CODE: 500         // Invitee gets 500 $GAME without code (normal welcome)
}

/**
 * Generate a unique 6-character referral code
 */
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I,O,0,1 to avoid confusion
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

/**
 * GET /api/user/referral?wallet=xxx
 * Get user's referral code and stats
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress = searchParams.get('wallet')

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet parameter is required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Get or create user's referral code
        let user = await db.collection('users').findOne({ walletAddress })

        if (!user) {
            await client.close()
            return NextResponse.json(
                { error: 'User not found. Create profile first.' },
                { status: 404 }
            )
        }

        // Generate referral code if doesn't exist
        if (!user.referralCode) {
            let code = generateReferralCode()

            // Ensure uniqueness
            while (await db.collection('users').findOne({ referralCode: code })) {
                code = generateReferralCode()
            }

            await db.collection('users').updateOne(
                { walletAddress },
                {
                    $set: {
                        referralCode: code,
                        referralCount: 0,
                        referralEarnings: 0
                    }
                }
            )
            user.referralCode = code
            user.referralCount = 0
            user.referralEarnings = 0
        }

        // Get referral history
        const referrals = await db.collection('referrals')
            .find({ referrerWallet: walletAddress })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray()

        await client.close()

        // Build referral link
        const referralLink = `https://t.me/ChessDAObot/app?startapp=REF_${user.referralCode}`

        return NextResponse.json({
            referralCode: user.referralCode,
            referralLink,
            stats: {
                totalReferred: user.referralCount || 0,
                totalEarnings: user.referralEarnings || 0,
                premiumReferred: referrals.filter(r => r.isPremium).length
            },
            rewards: {
                normalUser: REWARDS.REFERRER_NORMAL,
                premiumUser: REWARDS.REFERRER_PREMIUM,
                inviteeBonus: REWARDS.INVITEE_WITH_CODE
            },
            recentReferrals: referrals.map(r => ({
                username: r.inviteeUsername,
                isPremium: r.isPremium,
                reward: r.referrerReward,
                date: r.createdAt
            }))
        })

    } catch (error) {
        console.error('Referral GET error:', error)
        return NextResponse.json(
            { error: 'Failed to get referral data', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/user/referral
 * Apply referral code when new user signs up
 * Body: { inviteeWallet, referralCode, isPremium, inviteeUsername }
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { inviteeWallet, referralCode, isPremium, inviteeUsername } = body

        if (!inviteeWallet || !referralCode) {
            return NextResponse.json(
                { error: 'inviteeWallet and referralCode are required' },
                { status: 400 }
            )
        }

        const client = new MongoClient(MONGODB_URI)
        await client.connect()
        const db = client.db(DB_NAME)

        // Find referrer by code
        const referrer = await db.collection('users').findOne({
            referralCode: referralCode.toUpperCase()
        })

        if (!referrer) {
            await client.close()
            return NextResponse.json(
                { error: 'Invalid referral code' },
                { status: 404 }
            )
        }

        // Check if invitee is the same as referrer
        if (referrer.walletAddress === inviteeWallet) {
            await client.close()
            return NextResponse.json(
                { error: 'Cannot use your own referral code' },
                { status: 400 }
            )
        }

        // Check if invitee was already referred
        const existingReferral = await db.collection('referrals').findOne({
            inviteeWallet
        })

        if (existingReferral) {
            await client.close()
            return NextResponse.json(
                { error: 'User has already been referred' },
                { status: 400 }
            )
        }

        const now = new Date()
        const referrerReward = isPremium ? REWARDS.REFERRER_PREMIUM : REWARDS.REFERRER_NORMAL
        const inviteeReward = REWARDS.INVITEE_WITH_CODE

        // Create referral record
        await db.collection('referrals').insertOne({
            referrerWallet: referrer.walletAddress,
            inviteeWallet,
            inviteeUsername: inviteeUsername || 'Unknown',
            isPremium: isPremium || false,
            referrerReward,
            inviteeReward,
            createdAt: now
        })

        // Update referrer stats
        await db.collection('users').updateOne(
            { walletAddress: referrer.walletAddress },
            {
                $inc: {
                    referralCount: 1,
                    referralEarnings: referrerReward
                }
            }
        )

        // Give referrer their bonus
        await db.collection('game_balances').updateOne(
            { walletAddress: referrer.walletAddress },
            {
                $inc: {
                    gameBalance: referrerReward,
                    totalEarned: referrerReward
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        )

        // Give invitee their bonus (extra on top of welcome bonus)
        await db.collection('game_balances').updateOne(
            { walletAddress: inviteeWallet },
            {
                $inc: {
                    gameBalance: inviteeReward,
                    totalEarned: inviteeReward
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        )

        // Update invitee's user record with referral info
        await db.collection('users').updateOne(
            { walletAddress: inviteeWallet },
            {
                $set: {
                    referredBy: referralCode,
                    referralBonusReceived: inviteeReward,
                    updatedAt: now
                }
            }
        )

        // Create notifications
        await db.collection('notifications').insertMany([
            {
                userId: referrer.walletAddress,
                type: 'referral',
                title: isPremium ? '🌟 Premium Referral Bonus!' : '🎉 Referral Bonus!',
                message: `${inviteeUsername || 'A friend'} joined using your code! +${referrerReward.toLocaleString()} $GAME`,
                data: {
                    invitee: inviteeWallet,
                    reward: referrerReward,
                    isPremium
                },
                read: false,
                dismissed: false,
                createdAt: now
            },
            {
                userId: inviteeWallet,
                type: 'welcome',
                title: '🎁 Referral Welcome Bonus!',
                message: `Welcome! You received ${inviteeReward.toLocaleString()} $GAME bonus for joining with a referral code!`,
                data: {
                    referrer: referrer.username,
                    reward: inviteeReward
                },
                read: false,
                dismissed: false,
                createdAt: now
            }
        ])

        await client.close()

        return NextResponse.json({
            success: true,
            message: 'Referral applied successfully',
            referrerReward,
            inviteeReward,
            isPremium,
            totalInviteeBonus: inviteeReward + REWARDS.INVITEE_NO_CODE // Total with welcome
        })

    } catch (error) {
        console.error('Referral POST error:', error)
        return NextResponse.json(
            { error: 'Failed to apply referral', details: error.message },
            { status: 500 }
        )
    }
}
