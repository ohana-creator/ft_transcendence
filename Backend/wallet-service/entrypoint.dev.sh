#!/bin/sh
set -e

# ── Build DATABASE_URL from env vars ────────────────────────
if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  DB_PASSWORD_ENC=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$DB_PASSWORD")
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENC}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  echo "✔ DATABASE_URL built from environment variables"
fi

if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PASSWORD" ]; then
  export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
  echo "✔ REDIS_URL built from environment variables"
fi

# ── Prisma: generate client + apply migrations ──────────────
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate
  if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "⏳ Running prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "ℹ No prisma migrations found. Running prisma db push..."
    npx prisma db push
  fi
  echo "✔ Prisma ready"
fi

# ── Start the app (receives CMD from Dockerfile/compose) ────
echo "🚀 Starting: $@"
exec "$@"
