#!/bin/sh
set -e

export DB_PASSWORD=$(cat /run/secrets/ledger_db_password)
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

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

exec node dist/main.js
