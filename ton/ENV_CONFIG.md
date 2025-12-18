# ChessDAO TON Blockchain Configuration

This file documents the TON-specific environment variables needed for the project.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# TON Network Configuration
TON_NETWORK=testnet                    # Use 'mainnet' for production
TONCENTER_API_KEY=your_api_key_here   # Get from https://toncenter.com/

# Payment Configuration  
TON_PAYMENT_WALLET=EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI  # Your receiving wallet
NEXT_PUBLIC_TON_PAYMENT_WALLET=EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI  # Same, for frontend

# Contract Addresses (after deployment)
CHESS_TOKEN_ADDRESS=                  # Set after deploying chess_token.fc
GAME_ESCROW_ADDRESS=                  # Set after deploying game_escrow.fc
TON_ADMIN_ADDRESS=                    # Your admin wallet address
```

## Getting API Keys

### TonCenter API Key
1. Go to https://toncenter.com/
2. Click "Get API Key" 
3. Free tier allows 10 req/sec (sufficient for testing)

## Deployment Commands

```bash
# Navigate to TON contracts directory
cd ton

# Install dependencies
npm install

# Build contracts
npx blueprint build chess_token
npx blueprint build jetton_wallet
npx blueprint build game_escrow

# Deploy to testnet (requires mnemonic in .env)
npx blueprint run deployChessToken --network testnet

# Deploy to mainnet (use with caution!)
npx blueprint run deployChessToken --network mainnet
```

## Network Endpoints

- **Testnet API**: https://testnet.toncenter.com/api/v2
- **Mainnet API**: https://toncenter.com/api/v2
- **Testnet Explorer**: https://testnet.tonviewer.com
- **Mainnet Explorer**: https://tonviewer.com
