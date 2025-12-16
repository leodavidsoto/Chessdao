# ChessDAO Deployment Guide

## Quick Start (Railway)

### 1. Environment Variables Required

Set these in Railway Dashboard or via CLI:

```bash
# Required for production
NEXT_PUBLIC_SOLANA_NETWORK=devnet  # or mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_TREASURY_WALLET=3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo
TREASURY_WALLET=3bbdiPDBEQHjnQVjAnQ9uKDhPFYbT1njnN6kayCivcGo

# Database (optional - app works with in-memory fallback)
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dao_chess

# Auto-set by Railway
PORT=3000
NODE_ENV=production
```

### 2. Deploy to Railway

```bash
# Login to Railway
railway login

# Link to project
railway link

# Deploy
railway up

# Check logs
railway logs
```

### 3. Configure Domain

```bash
railway domain
```

## MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com/
2. Create new cluster (M0 free tier is fine)
3. Create database user with read/write permissions
4. Whitelist IP: `0.0.0.0/0` for Railway access
5. Get connection string and add to Railway as `MONGO_URL`

### Initialize Indexes

After MongoDB is connected:

```bash
MONGO_URL=your-connection-string node scripts/setup-db-indexes.js
```

## Token Sale Flow

1. User connects Phantom wallet
2. Enters amount of CHESS tokens to buy
3. Selects payment method (SOL or USDC)
4. Signs transaction with wallet
5. Backend verifies transaction on blockchain
6. Tokens credited to user's account

### Payment Verification

The `/api/payments/credit-tokens` endpoint:
- Validates transaction signature on Solana
- Checks treasury wallet received payment
- Prevents duplicate transactions
- Updates MongoDB balance (or in-memory)
- Returns new balance to user

## Mainnet Deployment Checklist

- [ ] Deploy CHESS token to mainnet
- [ ] Update `NEXT_PUBLIC_CHESS_MINT` with mainnet address
- [ ] Set `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
- [ ] Use production RPC (Helius/QuickNode recommended)
- [ ] Set up MongoDB Atlas production cluster
- [ ] Configure monitoring and alerts
- [ ] Test full payment flow with small amounts

## Architecture

```
Frontend (Next.js)
    |
    ├── Wallet Connection (Phantom)
    |
    ├── API Routes (/api/*)
    |    ├── /payments/credit-tokens
    |    ├── /balance
    |    ├── /transactions
    |    └── ...
    |
    └── WebSocket Server (Socket.io)
         └── Real-time game updates

Backend
    ├── Solana RPC (verify transactions)
    ├── MongoDB (persist data)
    └── In-memory fallback
```

## Rate Limits

- Payment endpoints: 5 requests/minute
- API endpoints: 100 requests/minute
- Default: 200 requests/minute

## Troubleshooting

### Service not starting
- Check Railway logs for build errors
- Verify all environment variables set
- Ensure `npm run build` works locally

### Payments not crediting
- Check Solana transaction confirmed
- Verify treasury wallet address correct
- Check MongoDB connection (falls back to memory)

### WebSocket disconnections
- Ensure CORS_ORIGINS set correctly
- Check Railway internal networking
