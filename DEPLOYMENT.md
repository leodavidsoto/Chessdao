# ChessDAO Deployment Guide (TON Blockchain)

## Architecture

```
├── Main App (Next.js) - Railway Service 1
│   └── chessdao-production.up.railway.app
│
└── Telegram Bot (Node.js) - Railway Service 2
    └── telegram-bot/bot.js
```

## 1. Main App Deployment (Railway)

### Environment Variables

```bash
# TON Configuration
NEXT_PUBLIC_TON_NETWORK=mainnet
NEXT_PUBLIC_TON_RPC_URL=https://toncenter.com/api/v2/jsonRPC
NEXT_PUBLIC_CHESS_JETTON=YOUR_JETTON_ADDRESS

# Treasury (TON wallet)
NEXT_PUBLIC_TREASURY_WALLET=YOUR_TON_WALLET
TREASURY_WALLET=YOUR_TON_WALLET

# Database
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/chessdao

# Auto-set by Railway
PORT=3000
NODE_ENV=production
```

### Deploy Commands

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

---

## 2. Telegram Bot Deployment

### Option A: Same Railway Project (Recommended)

1. Go to Railway Dashboard
2. Click "+ New Service"
3. Select "GitHub Repo" → `telegram-bot` folder
4. Set root directory: `telegram-bot`
5. Add environment variables:

```bash
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=https://chessdao-production.up.railway.app
API_URL=https://chessdao-production.up.railway.app
```

### Option B: Monorepo with Procfile

Create `Procfile.bot` in telegram-bot/:
```
web: node bot.js
```

### Option C: Run Locally

```bash
cd telegram-bot
npm install
BOT_TOKEN=xxx WEBAPP_URL=xxx node bot.js
```

---

## 3. TON Token Deployment

### Deploy CHESS Jetton

Use the contracts in `/ton/contracts/`:

```bash
cd ton
npm install
npm run deploy
```

After deployment, update:
- `NEXT_PUBLIC_CHESS_JETTON` in Railway

---

## 4. Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + Mini App |
| `/play` | Open game |
| `/invite` | Get referral link |
| `/balance` | Check balance |
| `/link <wallet>` | Link TON wallet |
| `/help` | All commands |

---

## Troubleshooting

### Bot not updating
- Verify bot token is correct
- Check Railway logs for bot service
- Redeploy bot service manually

### TON Connect issues
- Check `tonconnect-manifest.json` is accessible
- Verify WEBAPP_URL matches your domain

### Database connection
- Whitelist Railway IPs in MongoDB Atlas
- Use `0.0.0.0/0` for development
