#!/bin/sh
set -e

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$1"
}

trim() {
  printf '%s' "$1" | tr -d '\r\n'
}

export DB_PASSWORD=$(trim "$(cat /run/secrets/ledger_db_password)")
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
export REDIS_PASSWORD=$(cat /run/secrets/redis_password)

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
DB_PASSWORD_ENC=$(urlencode "$DB_PASSWORD")

export DATABASE_URL="postgresql://${DB_USER_ENC}:${DB_PASSWORD_ENC}@${DB_HOST_CLEAN}:${DB_PORT_CLEAN}/${DB_NAME_CLEAN}?schema=public"

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
