#!/bin/sh
set -e

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$1"
}

trim() {
  printf '%s' "$1" | tr -d '\r\n'
}

if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  DB_USER_CLEAN=$(trim "$DB_USER")
  DB_HOST_CLEAN=$(trim "$DB_HOST")
  DB_PORT_CLEAN=$(trim "$DB_PORT")
  DB_NAME_CLEAN=$(trim "$DB_NAME")

  [ -z "$DB_USER_CLEAN" ] && DB_USER_CLEAN="ledger_user"
  [ -z "$DB_HOST_CLEAN" ] && DB_HOST_CLEAN="ledgerDb"
  [ -z "$DB_NAME_CLEAN" ] && DB_NAME_CLEAN="ledger"
  if ! printf '%s' "$DB_PORT_CLEAN" | grep -Eq '^[0-9]+$'; then
    DB_PORT_CLEAN="5432"
  fi

  DB_USER_ENC=$(urlencode "$DB_USER_CLEAN")
  DB_PASSWORD_ENC=$(urlencode "$(trim "$DB_PASSWORD")")

  export DATABASE_URL="postgresql://${DB_USER_ENC}:${DB_PASSWORD_ENC}@${DB_HOST_CLEAN}:${DB_PORT_CLEAN}/${DB_NAME_CLEAN}?schema=public"
  echo "✔ DATABASE_URL built from environment variables"
fi

if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PASSWORD" ]; then
  export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
  echo "✔ REDIS_URL built from environment variables"
fi

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

echo "🚀 Starting: $@"
exec "$@"
