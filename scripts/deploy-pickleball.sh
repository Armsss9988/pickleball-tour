#!/bin/bash
# Deploy script: golabpickeball standalone
# Run: bash scripts/deploy-pickleball.sh (on server at /home/opc/golab-pickleball-standalone)

set -e
DEPLOY_DIR="/home/opc/golab-pickleball-standalone"
cd "$DEPLOY_DIR"

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies (jsonwebtoken added)..."
pnpm install --frozen-lockfile

echo "🔨 Building API..."
pnpm --filter @golab/api run build

echo "🔨 Building Web..."
pnpm --filter @golab/web run build

echo "🔄 Restarting PM2 processes..."
pm2 restart pickleball-api pickleball-web || pm2 reload all

echo "✅ Deploy complete!"
pm2 status
