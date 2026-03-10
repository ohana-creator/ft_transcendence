#!/bin/bash

# Master test script to run all service tests
# Run with: ./scripts/test-all.sh

echo "Running all service tests..."

./scripts/test-api-gateway.sh
echo ""

./scripts/test-auth-service.sh
echo ""

./scripts/test-campaign-service.sh
echo ""

./scripts/test-notification-service.sh
echo ""

./scripts/test-user-service.sh
echo ""

./scripts/test-wallet-service.sh
echo ""

echo "All tests completed."