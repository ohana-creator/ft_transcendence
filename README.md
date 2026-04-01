*This project has been created as part of the 42 curriculum by obento, mebo, jmiguel, kpedro*

# VAKS Platform — ft_transcendence

## Description
**Project name:** VAKS Platform (ft_transcendence adaptation)

**Goal:** Tokenized collaborative savings (“vaquinhas”) with public/private groups, auditable on-chain records, and a full web experience.

**Problem it solves:** Establishes trust and transparency for shared funds by combining microservices, event-driven coordination, and an optional Avalanche ERC-20 ledger.

**Key features:** Next.js 15 frontend; NestJS microservices (auth, user, wallet, campaign, notification, ledger, API gateway); PostgreSQL per service via Prisma; Redis Streams for events and token blacklist; JWT + OAuth (Google) + 2FA email; WebSockets for notifications; optional Avalanche Fuji on-chain ledger.

## Instructions
**Prerequisites**
- Node.js 18+
- npm
- Docker and Docker Compose
- Redis and PostgreSQL (provisioned by Compose)
- MetaMask (Fuji testnet AVAX) for on-chain flows (optional)
- Hardhat/ethers.js if redeploying the contract (optional)

**Environment setup**
- Copy env templates where present (examples):
	- apps/backend/ledger-service/.env.example → .env
	- apps/frontend/.env.example → .env.local
- For production compose, secrets are mounted from apps/backend/secrets (see apps/backend/docker-compose.yml). For development, inline envs are used (see apps/backend/docker-compose.dev.yml).
- Critical variables: JWT_SECRET, REDIS_PASSWORD, per-service DB_* and DATABASE_URL, AVALANCHE_RPC_URL, VAKS_CONTRACT_ADDRESS, ADMIN_PRIVATE_KEY, OAuth client IDs/secrets, SMTP_* for 2FA email.

**Install**
```bash
# Backend services (example: auth-service)
cd apps/backend/Backend/auth-service
npm install

# Frontend
cd apps/frontend
npm install
```

**Run (development)**
```bash
# Full stack with hot-reload and exposed ports
docker compose -f apps/backend/docker-compose.dev.yml up --build

# Frontend only
cd apps/frontend && npm run dev
```

**Run (production-like)**
```bash
docker compose -f apps/backend/docker-compose.yml up -d
```

**Default access URLs**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3000 (routes to services)
- Auth: http://localhost:3001
- Campaign: http://localhost:3002
- Notification (REST): http://localhost:3003 — WebSocket at /notifications
- User: http://localhost:3004
- Wallet: http://localhost:3005
- Ledger: http://localhost:3006 (Swagger at /api/docs)

## Resources
- Backend architecture, endpoints, epics: [apps/backend/docs/backend_arquitetura_api_epicos_Version5.md](apps/backend/docs/backend_arquitetura_api_epicos_Version5.md)
- Dev containers and compose details: [apps/backend/docs/development.md](apps/backend/docs/development.md)
- 2FA email guide: [apps/backend/2FA_EMAIL_QUICKSTART.md](apps/backend/2FA_EMAIL_QUICKSTART.md)
- Ledger service and contract: [apps/backend/docs/LEDGER_SERVICE.md](apps/backend/docs/LEDGER_SERVICE.md)
- Frontend structure and responsibilities: [apps/frontend/docs/TEAM_STRUCTURE.md](apps/frontend/docs/TEAM_STRUCTURE.md)
- Frontend README: [apps/frontend/README.md](apps/frontend/README.md)
- Tech references: Next.js, NestJS, Prisma, PostgreSQL, Redis Streams, Socket.io, Tailwind, Radix UI, ethers.js, Hardhat, Avalanche Fuji.
- AI usage: Used to change t-shirts colors for the photos on the landing page, help in understending bugs and erros, used for deep seek and research.

## Team Information
- **mebo** — Role: Product Manager/Frontend developer. Responsibilities: authentication UX (login/register/2FA/OAuth), dashboard, profile, landing, layout/i18n, auth contexts/hooks.
- **jmiguel** — Role: Tech Lead/Frontend Developer. Responsibilities: campaigns/vaquinhas pages, wallet flows (load/convert/transfer), realtime hooks/components, API utilities and formatting.
- **kpedro** — Role: Architect/Backend developer. Responsibilities: user service (profiles/avatars), campaign service (CRUD, roles, invites, contributions), security validation, data sync listeners.
- **obento** — Role: Product Owner/Backend Developer. Responsibilities: infra/docker, auth service, wallet service, notification service + WebSocket gateway, API gateway, security/rate limiting, ledger integration.


## Project Management
- Task organization: Epics and weekly milestones defined in backend architecture doc; ownership split between obento/kpedro for backend and mebo/jmiguel for frontend.
- Tools: GitHub.
- Communication: Slack/WhatsApp.

## Technical Stack (with rationale)
- **Frontend:** Next.js 15 + TypeScript, Tailwind, Radix UI, Lucide, WebSocket — modern DX, app router, typed UI, accessible components, and realtime UX.
- **Backend:** NestJS (Fastify) microservices — structured DI, guards, Swagger, performance with Fastify.
- **Database:** PostgreSQL per service with Prisma — isolation, typed client, migrations per domain.
- **Messaging/Cache:** Redis Streams for events and token blacklist; aligns with async workflows and revocation checks.
- **Auth/Security:** JWT, OAuth Google, 2FA email, rate limiting, bcrypt hashing.
- **Real-time:** Socket.io for notifications and live campaign/wallet updates.
- **Blockchain (bonus):** Avalanche Fuji ERC-20 (VAKS) via ethers.js + Hardhat; ledger service bridges on-chain and local state.
- **Infra:** Docker Compose (prod/dev variants), secrets for prod, bind mounts and hot reload for dev.

## Database Schema (summary)
- **Auth DB:** User (email, username, hashedPassword, googleId, twoFA fields), Session (token, expiry).
- **User DB:** User profile with avatar/bio, timestamps.
- **Wallet DB:** Wallet (per user), Transaction (P2P, campaign contribution/withdrawal; status; metadata; indexed timestamps).
- **Campaign DB:** Campaign (public/private, goal, owner replicas, status), CampaignMember (role SUDO/VAKER), Invitation (invite status, email/user references).
- **Notification DB:** Notification (type, message, metadata, read flag, createdAt).
- **Ledger DB (bonus):** LedgerEntry (txHash, operation, status, blockNumber metadata), wallet mapping.

## Features List
- Authentication and OAuth (Google) — JWT login, OAuth callback; Backend: kpedro; Frontend: mebo.
- 2FA Email — Code generation/validation with SMTP; Backend: kpedro; Frontend: mebo (forms/hooks).
- User Profiles & Avatars — CRUD, uploads; Backend: obento; Frontend: mebo (profile page integration).
- Wallet & P2P Transfers — Balances, history, atomic transfers; Backend: kpedro; Frontend: jmiguel.
- Campaigns (Public/Private) & Permissions — CRUD, invites, member roles, contributions; Backend: obento; Frontend: jmiguel.
- Real-Time Notifications — WebSocket gateway, event listeners; Backend: kpedro; Frontend: jmiguel realtime components.
- API Gateway — Routing, auth guard, rate limiting; Backend: kpedro.
- Ledger / Blockchain (bonus) — ERC-20 on Avalanche Fuji, mint/transfer/burn, sync with wallet; Backend: obento.
- Internationalization (PT/EN/ ES/ FR) — Frontend locales.

## Modules


**Web**

1. Use a framework for frontend and backend — MAJOR (2 pts)
Justification: Core structural choice to ensure scalability, maintainability, and clear architecture.
Implementation:
Frontend: Next.js 15
Backend: NestJS (Fastify)
Team:
Frontend: mebo, jmiguel
Backend: obento, kpedro

2. Real-time features (WebSockets) — MAJOR (2 pts)
Justification: Essential for live notifications, campaign updates, and wallet synchronization across users.
Implementation:
Socket.io in the notification-service
Event-driven communication using Redis Streams
Team:
Backend: obento
Frontend: jmiguel

3. Public API (secured, documented, rate-limited) — MAJOR (2 pts)
Justification: Enables external integrations and demonstrates production-level backend design.
Implementation:
Centralized API Gateway
JWT authentication + rate limiting
Swagger documentation in ledger-service
Team:
Backend: obento

4. ORM usage (Prisma) — MINOR (1 pt)
Justification: Ensures type safety, consistency, and efficient database access.
Implementation:
Prisma ORM used across all microservices
Team:
Backend: obento, kpedro

5. Notification system — MINOR (1 pt)
Justification: Improves user experience through real-time feedback on system events.
Implementation:
Dedicated notification service with WebSockets
Persistent storage in database
Team:
Backend: obento
Frontend: jmiguel

**User Management**

6. Standard user management system — MAJOR (2 pts)
Justification: Mandatory foundation for any multi-user web application.
Implementation:
Auth service (JWT-based login/register)
User profile and avatar management (user-service)
Team:
Backend: obento, kpedro
Frontend: mebo

7. Advanced permissions system — MAJOR (2 pts)
Justification: Required to manage access control for campaigns and user roles.
Implementation:
Role system: SUDO / VAKER
Authorization guards implemented in NestJS
Team:
Backend: obento

8. 2FA (Two-Factor Authentication) — MINOR (1 pt)
Justification: Enhances account security and protects sensitive operations.
Implementation:
Email-based verification codes (SMTP)
Expiration and rate limiting mechanisms
Team:
Backend: kpedro
Frontend: mebo

9. OAuth 2.0 (Google) — MINOR (1 pt)
Justification: Improves user onboarding and authentication experience.
Implementation:
Google OAuth integration in auth-service
Team:
Backend: kpedro
Frontend: mebo

**DevOps**

10. Microservices architecture — MAJOR (2 pts)
Justification: Key architectural decision enabling scalability, modularity, and service isolation.
Implementation:
Independent services: auth, user, wallet, campaign, notification, ledger
Communication via REST APIs and Redis Streams
Team:
Backend: obento, kpedro

**Accessibility & Internationalization**

11. Multi-language support (i18n) — MINOR (1 pt)
Justification: Prepares the platform for international adoption and broader accessibility.
Implementation:
Languages supported: PT / EN / ES / FR
Frontend translation system with language switching
Team:
Frontend: mebo

**Blockchain**

12. Blockchain integration (Avalanche Fuji ERC-20) — MAJOR (2 pts)
Justification: Provides transparency, trust, and auditability for shared funds.
Implementation:
ERC-20 smart contract (VAKS token)
Integration via ethers.js
Ledger service synchronizing on-chain and off-chain data
Team:
Backend: obento


**Modules of Choice**

13. Tokenized Collaborative Savings System (VAKS Core) — MAJOR (2 pts)

Justification:
This module is not part of the official subject and was designed to address a real-world problem: lack of trust in shared financial systems.
It combines multiple complex domains into a unified system:
Wallet
Campaigns
Blockchain
Event-driven architecture

Value Added:
Financial transparency
Auditable transactions
High relevance for emerging markets (e.g., Angola)

Implementation:
Campaign service (collaborative savings groups)
Wallet service (internal transactions)
Ledger service (on-chain synchronization)
Redis Streams for eventual consistency
Team:
Backend: obento, kpedro
Frontend: jmiguel






| Category   | Module          | Type  | Points |
| ---------- | --------------- | ----- | ------ |
| Web        | Frameworks      | Major | 2      |
| Web        | Real-time       | Major | 2      |
| Web        | Public API      | Major | 2      |
| Web        | ORM             | Minor | 1      |
| Web        | Notifications   | Minor | 1      |
| User       | User management | Major | 2      |
| User       | Permissions     | Major | 2      |
| User       | 2FA             | Minor | 1      |
| User       | OAuth           | Minor | 1      |
| DevOps     | Microservices   | Major | 2      |
| i18n       | Multi-language  | Minor | 1      |
| Blockchain | Avalanche       | Major | 2      |
| Custom     | VAKS System     | Major | 2      |
TOTAL: 21 points







## Individual Contributions
- **mebo:** Auth UI/flows, dashboard, profile, landing, layout/i18n, auth contexts/hooks; integrates wallet and notifications data.
- **jmiguel:** Campaign UIs (public/private/detail), contribution flows, wallet pages (load/convert/transfer), realtime hooks/components, API/util formatting.
- **kpedro:** Infra and Docker, auth service (JWT, OAuth Google, 2FA email), wallet service, notification service + WebSocket, API gateway, security/rate limiting, ledger integration (service + contract tooling).
- **obento:** User service (profile/avatar CRUD), campaign service (CRUD, roles, invites, contributions), validation and security hardening, event listeners for data sync.
- **Challenges and solutions**: token blacklist in Redis for logout, Prisma migrations on container boot, Redis Streams consumer groups for cross-service events, email 2FA with rate limiting/expiry, on-chain reconciliation via ledger events. (Specific incident logs not in repo; summary derived from docs.)

## Additional Information
- Architecture overview: Multi-service NestJS with REST + Redis Streams, gateway fronting services, PostgreSQL per service, Redis for cache/events, optional Avalanche ledger; see [apps/backend/docs/backend_arquitetura_api_epicos_Version5.md](apps/backend/docs/backend_arquitetura_api_epicos_Version5.md).
- Usage examples: Ledger cURL/PowerShell samples and JWT generation in [apps/backend/docs/LEDGER_SERVICE.md](apps/backend/docs/LEDGER_SERVICE.md); 2FA flows in [apps/backend/2FA_EMAIL_QUICKSTART.md](apps/backend/2FA_EMAIL_QUICKSTART.md).
- Known limitations: Frontend README flags pending full backend integration, auth wiring, WebSocket URL config, uploads, advanced search/categories, persistent notification center.
- Future improvements: Finish frontend-backend integration, add CI/CD and tests, expand monitoring/observability, document AI usage if applicable.
