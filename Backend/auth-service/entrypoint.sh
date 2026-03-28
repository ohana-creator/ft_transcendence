#!/bin/sh
set -e

# Read secrets from Docker secrets
DB_PASSWORD_RAW=$(cat /run/secrets/auth_db_password | tr -d '\n' | tr -d '\r')
export JWT_SECRET=$(cat /run/secrets/jwt_secret)

# URL encode the password using sed (replace special chars)
DB_PASSWORD_ENCODED=$(echo "$DB_PASSWORD_RAW" | sed 's/+/%2B/g; s/\//%2F/g; s/=/%3D/g')

# Build the DATABASE_URL from environment variables + secret
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENCODED}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)

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
