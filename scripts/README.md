# Test Scripts for VAKS Backend Services

This directory contains bash scripts to test the endpoints of each backend service, based on the Ohana Issues.

## Prerequisites

- Backend services running via Docker Compose: `docker compose -f docker-compose.dev.yml up --build`
- `jq` installed for JSON formatting: `sudo apt install jq` (or equivalent)
- Services on their respective ports (3000-3005)

## Scripts

- `test-api-gateway.sh`: Tests API Gateway endpoints
- `test-auth-service.sh`: Tests Auth Service (register, login)
- `test-campaign-service.sh`: Tests Campaign Service (CRUD, contribute)
- `test-notification-service.sh`: Tests Notification Service (basic)
- `test-user-service.sh`: Tests User Service (CRUD, avatar, search)
- `test-wallet-service.sh`: Tests Wallet Service (balance, transfer)
- `test-all.sh`: Runs all scripts sequentially

## Usage

Make scripts executable (already done):
```bash
chmod +x scripts/*.sh
```

Run individual tests:
```bash
./scripts/test-user-service.sh
```

Run all tests:
```bash
./scripts/test-all.sh
```

## Notes

- Tokens are placeholders; replace with real JWTs from auth-service.
- Some endpoints may not be fully implemented yet (e.g., campaign CRUD).
- Outputs are formatted with `jq` for readability.
- Assumes services are running on localhost with dev ports.