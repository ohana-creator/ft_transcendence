#!/bin/bash

# Test script for User Service (Issue #3)
# Run with: ./scripts/test-user-service.sh

BASE_URL="http://localhost:3004/api"

echo "=== User Service Tests ==="

# Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Assume we have a token from auth-service, but for demo, use placeholder
TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Get user profile
echo "2. Get User Profile (ID 1)"
curl -s "$BASE_URL/users/1" | jq .
echo ""

# Search users
echo "3. Search Users"
curl -s "$BASE_URL/users/search?q=john&page=1&limit=10" | jq .
echo ""

# Update profile (requires auth)
echo "4. Update Profile (ID 1)"
curl -s -X PUT "$BASE_URL/users/1" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newname","bio":"Updated bio"}' | jq .
echo ""

# Upload avatar (requires auth, but skip file upload for now)
echo "5. Upload Avatar (ID 1) - Skipped (needs file)"
# curl -X POST -F "avatar=@photo.jpg" -H "Authorization: $TOKEN" "$BASE_URL/users/1/avatar"

# Delete avatar
echo "6. Delete Avatar (ID 1)"
curl -s -X DELETE "$BASE_URL/users/1/avatar" \
  -H "Authorization: $TOKEN" | jq .
echo ""

echo "=== Tests Complete ==="