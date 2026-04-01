#!/bin/sh
set -e

if [ -f /run/secrets/jwt_secret ]; then
	export JWT_SECRET=$(cat /run/secrets/jwt_secret)
fi

if [ -f /run/secrets/redis_password ]; then
	export REDIS_PASSWORD=$(cat /run/secrets/redis_password)
fi

# api-gateway has no database — just start the app
echo "🚀 Starting: $@"
exec "$@"
