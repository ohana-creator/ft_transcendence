#!/bin/bash

# Test script for API Gateway
# Run with: ./scripts/test-api-gateway.sh

BASE_URL="http://localhost:3000/api"

echo "=== API Gateway Tests ==="

# Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Proxy to user service
echo "2. Proxy to User Service"
curl -s "$BASE_URL/users/1" | jq .
echo ""

echo "=== Tests Complete ==="