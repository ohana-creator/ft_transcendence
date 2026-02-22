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
| `redis_password.txt`          | redis + all services             |
| `jwt_secret.txt`              | auth-service + api-gateway       |

### How to generate strong passwords

```bash
# Generate a random 32-char password
openssl rand -base64 32 | tr -d '\n' > auth_db_password.txt

# Or for all files at once
for f in auth_db_password campaign_db_password notification_db_password \
         user_db_password wallet_db_password redis_password jwt_secret; do
  openssl rand -base64 32 | tr -d '\n' > "${f}.txt"
done
```

### Permissions

In production, restrict access:

```bash
chmod 600 secrets/*.txt
```
