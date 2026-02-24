#!/bin/sh
set -e

# api-gateway has no database — just start the app
echo "🚀 Starting: $@"
exec "$@"
