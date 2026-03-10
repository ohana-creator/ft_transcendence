#!/bin/bash

# Test script for Auth Service
# Run with: ./scripts/test-auth-service.sh

BASE_URL="http://localhost:3001/api"

echo "=== Auth Service Tests ==="

# Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Register
echo "2. Register User"
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}' | jq .
echo ""

# Login
echo "3. Login"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .
echo ""

echo "=== Tests Complete ==="