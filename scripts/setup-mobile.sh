#!/bin/bash

# ChessDAO Mobile Setup Script
# This script configures and builds the mobile app

set -e

echo "🏰 ChessDAO Mobile Build Script"
echo "================================"

# Check if BACKEND_URL is provided
if [ -z "$1" ]; then
    echo ""
    echo "Usage: ./scripts/setup-mobile.sh <BACKEND_URL>"
    echo ""
    echo "Example: ./scripts/setup-mobile.sh https://chessdao-production.up.railway.app"
    echo ""
    echo "First deploy to Railway:"
    echo "  1. railway login"
    echo "  2. railway init"
    echo "  3. railway up"
    echo "  4. Copy the URL and run this script again"
    exit 1
fi

BACKEND_URL=$1

echo ""
echo "📡 Backend URL: $BACKEND_URL"
echo ""

# Create .env.mobile file
echo "Creating .env.mobile..."
cat > .env.mobile << EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_WS_URL=$BACKEND_URL
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EOF

# Copy to .env.local for build
cp .env.mobile .env.local

echo "✅ Environment configured"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

# Build for mobile (static export)
echo ""
echo "🔨 Building for mobile..."
NEXT_OUTPUT=export npm run build

# Check if build succeeded
if [ ! -d "out" ]; then
    echo "❌ Build failed - 'out' directory not created"
    exit 1
fi

echo "✅ Build complete"

# Initialize Android if not exists
if [ ! -d "android" ]; then
    echo ""
    echo "📱 Initializing Android project..."
    npx cap add android
fi

# Sync with Capacitor
echo ""
echo "🔄 Syncing with Capacitor..."
npx cap sync android

echo ""
echo "✅ Mobile setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open Android Studio: npx cap open android"
echo "  2. Build APK: Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "  3. Find APK at: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Or run: npm run cap:open"
