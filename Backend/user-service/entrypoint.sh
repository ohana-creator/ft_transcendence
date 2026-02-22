#!/bin/sh
set -e

# Read password from Docker secret
DB_PASSWORD=$(cat /run/secrets/user_db_password)

# Build the DATABASE_URL from environment variables + secret
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# Apply pending migrations (safe to run repeatedly — only applies what's new)
npx prisma migrate deploy

# Start the application
exec node dist/main
