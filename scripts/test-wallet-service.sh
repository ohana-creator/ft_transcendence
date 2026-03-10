#!/bin/bash

# Test script for Wallet Service
# Run with: ./scripts/test-wallet-service.sh

BASE_URL="http://localhost:3005/api"

echo "=== Wallet Service Tests ==="

# Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Assume token
TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Get balance
echo "2. Get Balance (User 1)"
curl -s -H "Authorization: $TOKEN" "$BASE_URL/wallet/balance" | jq .
echo ""

# Transfer (requires auth)
echo "3. Transfer VAKS"
curl -s -X POST "$BASE_URL/wallet/transfer" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toUserId":2,"amount":10}' | jq .
echo ""

echo "=== Tests Complete ==="