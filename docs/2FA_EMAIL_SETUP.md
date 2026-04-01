# 2FA via Email Implementation

## Overview

Two-factor authentication (2FA) via email has been implemented. Users can now receive a random 6-digit code via email for login confirmation or can enable persistent 2FA on their account.

## Features

### 1. **2FA Code During Login**
When a user logs in with email + password, they receive a 6-digit code via email to confirm authentication.

**Flow:**
1. User calls `POST /auth/login` with email/username + password
2. If 2FA is enabled, server responds with `requiresTwoFA: true` + temporary token
3. User calls `POST /auth/2fa/email/request` with email to get a code sent
4. User receives code in email
5. User calls `POST /auth/2fa/email/validate` with temporary token + code
6. Server validates and returns access token

### 2. **Enable 2FA on Account**
Authenticated users can enable persistent 2FA via email:

**Flow:**
1. User calls `POST /auth/2fa/email/enable` (requires JWT token)
2. Server generates code and sends via email
3. User calls `POST /auth/2fa/email/confirm` with code
4. 2FA is now enabled on account — every login will require email code

### 3. **Disable 2FA on Account**
Users can disable 2FA with email confirmation:

**Flow:**
1. User calls `POST /auth/2fa/email/disable` (requires JWT token, no code)
2. Server sends confirmation code to email
3. User calls `POST /auth/2fa/email/disable` again with code
4. 2FA is disabled

## API Endpoints

### Login with 2FA

#### 1. Login (Standard)
```http
POST /auth/login
Content-Type: application/json

{
  "identifier": "user@example.com",
  "password": "MyPassword123"
}
```

Response (if 2FA enabled):
```json
{
  "success": true,
  "requiresTwoFA": true,
  "tempToken": "eyJhbGc..."
}
```

#### 2. Request 2FA Code
```http
POST /auth/2fa/email/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Code sent to your email"
}
```

User receives email with 6-digit code, expires in 10 minutes.

#### 3. Validate 2FA Code
```http
POST /auth/2fa/email/validate
Content-Type: application/json

{
  "tempToken": "eyJhbGc...",
  "code": "123456"
}
```

Response (if valid):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "username": "john_doe",
      "authProvider": "LOCAL"
    },
    "accessToken": "eyJhbGc..."
  }
}
```

### Account Settings (Authenticated)

#### 1. Enable 2FA Email
```http
POST /auth/2fa/email/enable
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "success": true,
  "message": "Confirmation code sent to your email"
}
```

User receives email, expires in 15 minutes.

#### 2. Confirm 2FA Setup
```http
POST /auth/2fa/email/confirm
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "code": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "2FA via email enabled successfully"
}
```

#### 3. Disable 2FA (First Request — Get Code)
```http
POST /auth/2fa/email/disable
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "success": true,
  "message": "Disable confirmation code sent to your email",
  "requiresConfirmation": true
}
```

#### 4. Disable 2FA (Second Request — Confirm with Code)
```http
POST /auth/2fa/email/disable
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "code": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "2FA email disabled successfully"
}
```

## Configuration

### Email Service Setup

The email service requires SMTP configuration via environment variables:

```env
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com    # SMTP authentication username
SMTP_PASSWORD=your-app-password   # SMTP authentication password (for Gmail, use App Password)
SMTP_FROM=noreply@ft-transcendence.com  # From address (optional, defaults to above)
```

### Gmail App Password Setup

If using Gmail:
1. Enable 2-Step Verification: https://accounts.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated password in `SMTP_PASSWORD`

### Local Development

For local development without actual email sending, you can:
- Use **Mailtrap** (free fake SMTP service): https://mailtrap.io
- Use **MailHog** (local SMTP server): https://github.com/mailhog/MailHog
- Leave SMTP unconfigured to see logs only (no emails sent)

#### Example with Mailtrap:
```env
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
SMTP_FROM=noreply@ft-transcendence.local
```

## Code Details

### Auth Service Changes

Files modified:
- `Backend/auth-service/prisma/schema.prisma` — Added fields to User model
- `Backend/auth-service/src/auth/auth.service.ts` — New methods for 2FA email
- `Backend/auth-service/src/auth/auth.controller.ts` — New endpoints
- `Backend/auth-service/src/auth/dto/two-fa-email.dto.ts` — New DTOs

### Notification Service Changes

Files added/modified:
- `Backend/notification-service/src/notifications/email.service.ts` — Email sending service
- `Backend/notification-service/src/events/event-consumer.service.ts` — Email event handlers
- `Backend/notification-service/src/notifications/notifications.module.ts` — Exports EmailService
- `Backend/notification-service/package.json` — Added `nodemailer` dependency

### Database Changes

Migration adds two columns to User table:
- `twoFAEmailCode` (TEXT) — Stores temporary code
- `twoFAEmailExpiresAt` (TIMESTAMP) — Code expiration time

### Event Flow

```
[Auth Service]
    ↓
generate code + store
    ↓
publish '2fa.email.code-generated' event to Redis
    ↓
[Notification Service]
    ↓
EventConsumerService listens
    ↓
calls EmailService.send2FACode()
    ↓
Also creates in-app notification
    ↓
User receives email + notification
```

## Security Considerations

1. **Code Storage** — Codes are stored in plaintext in database (could be hashed in future if needed)
2. **Code Expiration** — 10 minutes for login codes, 15 minutes for setup codes
3. **Rate Limiting** — Throttled at 5 attempts per minute for validation, 3 per minute for requesting
4. **Temp Token** — Login temp tokens are short-lived (5 minutes)
5. **SMTP** — Supports both TLS (587) and SSL (465)

## Testing

### Manual Test Flow

**1. Test Login with 2FA:**
```bash
# 1. Enable 2FA on account first (use GET /auth/me to get JWT if needed)
curl -X POST http://localhost:3000/auth/2fa/email/enable \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json"

# 2. Confirm with code from email
curl -X POST http://localhost:3000/auth/2fa/email/confirm \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"code":"XXXXXX"}'

# 3. Logout and login again
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"Password123"}'

# Should return requiresTwoFA: true with tempToken

# 4. Request code
curl -X POST http://localhost:3000/auth/2fa/email/request \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# 5. Get code from email and validate
curl -X POST http://localhost:3000/auth/2fa/email/validate \
  -H "Content-Type: application/json" \
  -d '{"tempToken":"<tempToken>","code":"XXXXXX"}'

# Should return full accessToken
```

## Troubleshooting

### Emails not being sent
1. Check SMTP configuration in `.env`
2. Verify SMTP credentials are correct
3. Check notification-service logs for email errors
4. Ensure notification-service has restarted after env changes

### Code expiration too strict/lenient
Edit the timeout values in `auth.service.ts`:
- Login codes: `new Date(Date.now() + 10 * 60 * 1000)` 
- Setup codes: `new Date(Date.now() + 15 * 60 * 1000)`
- Disable codes: `new Date(Date.now() + 10 * 60 * 1000)`

### Database migration issues
If migration fails on container startup:
1. Check authDb container logs
2. Verify DATABASE_URL is set correctly
3. Try: `docker rm -f authDb auth_data` and restart compose

