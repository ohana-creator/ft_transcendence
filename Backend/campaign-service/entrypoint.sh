#!/bin/sh
set -e

# Read secrets from Docker secrets
DB_PASSWORD=$(cat /run/secrets/campaign_db_password | tr -d '\n')
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
# Build the DATABASE_URL from environment variables + secret
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)
export INTERNAL_API_KEY=$(cat /run/secrets/internal_api_key)
export R2_ACCESS_KEY_ID=$(cat /run/secrets/r2_access_key_id)
export R2_SECRET_ACCESS_KEY=$(cat /run/secrets/r2_secret_access_key)

# ── Prisma: generate client + apply migrations ──────────────
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate

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

# Start the application
exec node dist/src/main.js
