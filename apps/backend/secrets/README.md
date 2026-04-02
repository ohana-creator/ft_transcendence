# Secrets

This folder contains Docker Secrets used by the application.

## ⚠️ NEVER commit real passwords to version control

Each `.txt` file contains a single secret value (no trailing newline).

### Files

| File                          | Used by                          |
| ----------------------------- | -------------------------------- |
| `auth_db_password.txt`        | authDb + auth-service            |
| `campaign_db_password.txt`    | campaignDb + campaign-service    |
| `notification_db_password.txt`| notificationDb + notification-service |
| `user_db_password.txt`        | userDb + user-service            |
| `wallet_db_password.txt`      | walletDb + wallet-service        |
| `ledger_db_password.txt`      | ledgerDb + ledger-service        |
| `admin_private_key.txt`       | ledger-service (blockchain signer) |
| `redis_password.txt`          | redis + all services             |
| `jwt_secret.txt`              | auth-service + api-gateway       |
| `internal_api_key.txt`        | campaign-service + wallet-service |
| `google_client_id.txt`        | auth-service                     |
| `google_client_secret.txt`    | auth-service                     |
| `r2_access_key_id.txt`        | user-service                     |
| `r2_secret_access_key.txt`    | user-service                     |

## TLS for backend HTTPS

The backend now requires HTTPS in all API services. Generate local certificates before starting Docker Compose:

```bash
./scripts/generate-backend-tls.sh
```

This creates the following files in `secrets/tls/`:

- `ca.crt` (certificate authority used by services)
- `backend.crt` (server certificate shared by backend services)
- `backend.key` (private key)

If your browser warns about local HTTPS, import `secrets/tls/ca.crt` into your OS/browser trust store.

### How to generate strong passwords

```bash
# Run from the project root:
# cd secrets

set -euo pipefail

# Ledger signer private key placeholder (hex 0x...)
printf '%s' 'replace_with_0x_private_key' > admin_private_key.txt

# 1) Generate random secrets (base64, no trailing newline)
for f in \
  auth_db_password \
  campaign_db_password \
  notification_db_password \
  user_db_password \
  wallet_db_password \
  ledger_db_password \
  redis_password \
  jwt_secret \
  internal_api_key
do
  openssl rand -base64 48 | tr -d '\n' > "${f}.txt"
done

# 2) Create placeholders for provider-managed credentials
printf '%s' 'your_google_client_id' > google_client_id.txt
printf '%s' 'your_google_client_secret' > google_client_secret.txt
printf '%s' 'your_r2_access_key_id' > r2_access_key_id.txt
printf '%s' 'your_r2_secret_access_key' > r2_secret_access_key.txt

echo 'Secrets files generated in ./secrets'
```

### Permissions

In production, restrict access:

```bash
chmod 600 secrets/*.txt
```
