#!/bin/sh
set -e

# Read passwords from Docker secrets
DB_PASSWORD=$(cat /run/secrets/user_db_password)
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)
# Read R2 credentials from Docker secrets
export R2_ACCESS_KEY_ID=$(cat /run/secrets/r2_access_key_id)
export R2_SECRET_ACCESS_KEY=$(cat /run/secrets/r2_secret_access_key)

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

# Start the application
exec node dist/src/main.js
