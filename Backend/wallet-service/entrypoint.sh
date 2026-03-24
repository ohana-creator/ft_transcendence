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

# ── Prisma: generate client + apply migrations ──────────────
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate
  echo "⏳ Running prisma migrate deploy..."
  if [ ! -d "prisma/migrations" ]; then
    echo "⏳ Running prisma migrate dev --name init..."
    npx prisma migrate dev --name init
  else
    echo "⏳ Running prisma migrate deploy..."
    npx prisma migrate deploy
  fi
  echo "✔ Prisma ready"
fi

exec node dist/src/main.js
