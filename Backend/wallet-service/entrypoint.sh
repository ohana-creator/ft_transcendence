#!/bin/sh
set -e

# Read secrets from Docker secrets
DB_PASSWORD=$(tr -d '\r\n' < /run/secrets/wallet_db_password)
export JWT_SECRET=$(cat /run/secrets/jwt_secret)

DB_PASSWORD_ENC=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD")

# Build the DATABASE_URL from environment variables + secret
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENC}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)
export INTERNAL_API_KEY=$(cat /run/secrets/internal_api_key)

# ── Prisma: generate client + apply schema ──────────────
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate
  
  # Use db push if no migrations exist, otherwise use migrate deploy
  if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "⏳ Running prisma migrate deploy..."
    npx prisma migrate deploy || echo "⚠ migrate deploy failed, trying db push..."
    npx prisma db push --accept-data-loss 2>/dev/null || true
  else
    echo "⏳ Running prisma db push..."
    npx prisma db push --accept-data-loss
  fi
  echo "✔ Prisma ready"
fi

exec node dist/src/main.js
