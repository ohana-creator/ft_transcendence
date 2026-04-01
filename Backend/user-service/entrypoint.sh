#!/bin/sh
set -e

# Read passwords from Docker secrets
DB_PASSWORD_RAW=$(cat /run/secrets/user_db_password | tr -d '\n' | tr -d '\r')
DB_PASSWORD_ENCODED=$(node -p "encodeURIComponent(process.argv[1])" "$DB_PASSWORD_RAW")
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENCODED}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)
# Read R2 credentials from Docker secrets
export R2_ACCESS_KEY_ID=$(cat /run/secrets/r2_access_key_id 2>/dev/null || echo "")
export R2_SECRET_ACCESS_KEY=$(cat /run/secrets/r2_secret_access_key 2>/dev/null || echo "")

# ── Prisma: generate client + apply migrations ──────────────
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  DATABASE_URL="$DATABASE_URL" npx prisma generate
  echo "⏳ Running prisma migrate deploy..."
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
  echo "✔ Prisma ready"
fi

# Start the application
exec node dist/src/main.js
