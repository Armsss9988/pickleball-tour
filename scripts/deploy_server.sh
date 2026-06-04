#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
REPO_DIR="${REPO_DIR:-$HOME/golab-tournament-pickleball}"

echo "[deploy] repo: $REPO_DIR"
echo "[deploy] branch: $BRANCH"

cd "$REPO_DIR"

git fetch origin
git reset --hard "origin/$BRANCH"
git clean -fd

pnpm install --frozen-lockfile
pnpm --filter @golab/contracts build
pnpm --filter @golab/domain build
pnpm --filter @golab/db generate
pnpm --filter @golab/db exec prisma migrate deploy
pnpm --filter @golab/api build
pnpm --filter @golab/web build

pm2 restart golab-api golab-web
pm2 save

echo "[deploy] done"
