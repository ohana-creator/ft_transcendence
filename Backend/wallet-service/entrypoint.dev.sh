#!/bin/sh
set -e

if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  echo "✔ DATABASE_URL built from environment variables"
fi

if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate
  echo "⏳ Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "✔ Prisma ready"
fi

echo "🚀 Starting: $@"
exec "$@"
