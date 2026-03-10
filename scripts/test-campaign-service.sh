#!/bin/bash

# Test script for Campaign Service (Issue #5)
# Run with: ./scripts/test-campaign-service.sh

BASE_URL="http://localhost:3002/api"

echo "=== Campaign Service Tests ==="

# Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Assume token
TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# List campaigns
echo "2. List Campaigns"
curl -s "$BASE_URL/campaigns?page=1&limit=10" | jq .
echo ""

# Create campaign (requires auth)
echo "3. Create Campaign"
curl -s -X POST "$BASE_URL/campaigns" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Campaign","description":"Description here","isPrivate":false,"goalAmount":1000}' | jq .
echo ""

# Get campaign details
echo "4. Get Campaign Details (ID 1)"
curl -s "$BASE_URL/campaigns/1" | jq .
echo ""

# Contribute (requires auth)
echo "5. Contribute to Campaign (ID 1)"
curl -s -X POST "$BASE_URL/campaigns/1/contribute" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50}' | jq .
echo ""

echo "=== Tests Complete ==="