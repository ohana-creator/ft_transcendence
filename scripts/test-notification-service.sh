#!/bin/bash

# Test script for Notification Service
# Run with: ./scripts/test-notification-service.sh

BASE_URL="http://localhost:3003/api"

echo "=== Notification Service Tests ==="

# Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Assume token
TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Get notifications (assuming endpoint exists)
echo "2. Get Notifications"
curl -s -H "Authorization: $TOKEN" "$BASE_URL/notifications" | jq .
echo ""

echo "=== Tests Complete ==="