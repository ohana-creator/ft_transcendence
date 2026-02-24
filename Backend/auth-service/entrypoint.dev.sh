#!/bin/sh
set -e

# ── Build DATABASE_URL from env vars ────────────────────────
if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  echo "✔ DATABASE_URL built from environment variables"
fi

if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PASSWORD" ]; then
  export REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
  echo "✔ DATABASE_URL built from environment variables"
fi

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

# ── Start the app (receives CMD from Dockerfile/compose) ────
echo "🚀 Starting: $@"
exec "$@"
