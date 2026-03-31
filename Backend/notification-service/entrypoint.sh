#!/bin/sh
set -e

# Read secrets from Docker secrets
DB_PASSWORD=$(cat /run/secrets/notification_db_password)
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)

# Build the DATABASE_URL from environment variables + secret
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# ── Prisma: generate client + apply migrations ──────────────
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate
  echo "⏳ Running prisma migrate deploy..."
  if ! npx prisma migrate deploy; then
    echo "⚠ prisma migrate deploy failed; continuing startup with existing schema"
  fi
  echo "✔ Prisma ready"
fi
# Start the application
exec node dist/src/main.js
