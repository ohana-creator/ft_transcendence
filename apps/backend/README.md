# Backend — ft_transcendence (VAKS)

> **Plataforma de Campanhas Colaborativas com Blockchain**
> Um sistema de microserviços moderno com autenticação, carteira digital, ledger blockchain e notificações em tempo real.

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura de Microserviços](#-arquitetura-de-microserviços)
3. [Stack Tecnológico](#-stack-tecnológico)
4. [Instalação e Setup](#-instalação-e-setup)
5. [Serviços](#-serviços)
6. [Estrutura de Ficheiros](#-estrutura-de-ficheiros)
7. [Fluxos Principais](#-fluxos-principais)
8. [Desenvolvimento](#-desenvolvimento)
9. [Deployment](#-deployment)
10. [Documentação Adicional](#-documentação-adicional)

---

## 🎯 Visão Geral

O **backend de ft_transcendence** é um ecossistema de **6 microserviços NestJS** orquestrados via Docker, cada um responsável por um domínio específico:

- **Auth Service** — Autenticação, JWT, OAuth Google, 2FA
- **User Service** — Perfis de utilizador
- **Wallet Service** — Carteira virtual e transferências
- **Campaign Service** — Gestão de campanhas e eventos
- **Notification Service** — Notificações assíncronas e email
- **Ledger Service** — Blockchain (Avalanche) para auditoria imutável
- **API Gateway** — Ponto de entrada único (HTTP reverse proxy)

### Características principais

✅ **Arquitetura de Microserviços** — Cada serviço tem base de dados isolada
✅ **Autenticação Robusta** — JWT, OAuth Google, Rate limiting, 2FA por email
✅ **Blockchain Integrado** — Smart contract ERC-20 em Avalanche Fuji
✅ **Comunicação Assíncrona** — Redis Streams entre serviços
✅ **Desenvolvimento Local** — Docker Compose com hot-reload
✅ **Documentação Automática** — Swagger/OpenAPI em cada serviço
✅ **Health Checks** — Monitorização nativa do Docker

---

## 🏗️ Arquitetura de Microserviços

### Diagrama de Infraestrutura

```
                            ┌──────────────────────┐
                            │    FRONTEND          │
                            └──────────┬───────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  │           HOST PORT :3000                │
                  └────────────────────┬────────────────────┘
                                       │
                            ┌──────────▼──────────┐
                            │  API GATEWAY :3000  │
                            └──────────┬──────────┘
                                       │
           ┌─────────────────────┬─────┴─────┬─────────────────────┐
           │                     │           │                     │
    ┌──────▼──────┐    ┌────────▼────┐   ┌──▼───────────┐   ┌─────▼──────┐
    │ AUTH         │    │ CAMPAIGN    │   │ USER         │   │ WALLET     │
    │ SERVICE      │    │ SERVICE     │   │ SERVICE      │   │ SERVICE    │
    │ :3001       │    │ :3002       │   │ :3004        │   │ :3005      │
    └──────┬──────┘    └────────┬────┘   └──┬───────────┘   └─────┬──────┘
           │                    │           │                     │
    ┌──────▼──────┐    ┌────────▼────┐   ┌──▼───────────┐   ┌─────▼──────┐
    │ authDb      │    │ campaignDb  │   │ userDb       │   │ walletDb   │
    │ PostgreSQL  │    │ PostgreSQL  │   │ PostgreSQL   │   │ PostgreSQL │
    │ :5432      │    │ :5433       │   │ :5435        │   │ :5436      │
    └─────────────┘    └─────────────┘   └──────────────┘   └────────────┘
           │                    │           │                     │
           └────────────────┬───┴───────────┴─────────────────────┘
                            │ (rede isolada per-domínio)
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
    ┌──▼──────────┐  ┌──────▼────────┐  ┌───────▼─────────┐
    │NOTIFICATION │  │    REDIS      │  │   LEDGER        │
    │SERVICE      │  │   Streams     │  │   SERVICE       │
    │:3003        │  │   Cache       │  │   :3006         │
    └──┬──────────┘  └───────────────┘  │ +               │
       │                                 │ Smart Contract  │
    ┌──▼──────────┐                     │ Avalanche Fuji  │
    │notificationDb                      └────────┬────────┘
    │PostgreSQL   │                              │
    │:5434        │                      ┌───────▼────────┐
    └─────────────┘                      │    ledgerDb    │
                                         │ PostgreSQL     │
                                         │ :5437          │
                                         └────────────────┘
```

### Padrão: Database-per-Service

Cada microserviço tem:
- **Base de dados isolada** — Impossível de outros serviços acessarem diretamente
- **Rede Docker separada** — `authnet`, `usernet`, `walletnet`, etc.
- **ORM Prisma** — Migrações automáticas no boot

**Benefícios:**
- ✅ Autonomia — cada equipa evolui o schema independentemente
- ✅ Segurança — um serviço comprometido não acede a outros dados
- ✅ Escalabilidade — cada base pode ser escalada separadamente

### Comunicação Entre Serviços

1. **HTTP** — Via API Gateway (rápido, síncrono)
2. **Redis Streams** — Para eventos assíncrona (robusto, persistente)
3. **API Internal** — Serviço-a-serviço com `X-Internal-API-Key`

---

## 💻 Stack Tecnológico

### Core
- **NestJS 11** — Framework Node.js robusto
- **Fastify** — HTTP server (2x mais rápido que Express)
- **TypeScript 5** — Tipagem estática
- **Node.js 20 Alpine** — Imagens leves em produção

### Dados e Cache
- **PostgreSQL 16** — Banco relacional
- **Prisma 7** — ORM tipado com migrations automáticas
- **Redis 7** — Cache e Redis Streams
- **ioredis** — Cliente Redis para Node.js

### Autenticação e Segurança
- **Passport.js** — Autenticação modular
- **JWT** — Tokens stateless
- **bcrypt** — Hashing de passwords
- **otplib** — TOTP 2FA (Google Authenticator)
- **Rate Limiting** — Proteção contra brute-force

### Blockchain
- **Hardhat** — Framework Ethereum/Solidity
- **ethers.js** — Interação com blockchain
- **Avalanche Fuji Testnet** — Rede de testes

### Ferramentas
- **Swagger/OpenAPI** — Documentação automática
- **Docker** — Containerização
- **Docker Compose** — Orquestração local
- **ESLint + Prettier** — Linting e formatação

---

## 📦 Instalação e Setup

### Pré-requisitos

- **Node.js 20+** e npm
- **Docker Desktop** (com docker-compose)
- **Git**
- **Visual Studio Code** (recomendado)

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/seu-username/ft_transcendence.git
cd ft_transcendence
```

### 2️⃣ Preparar variáveis de ambiente

```bash
# Copia o ficheiro de exemplo
cp apps/backend/.env.example apps/backend/.env

# Edita com as credenciais (Google OAuth, SMTP, etc.)
nano apps/backend/.env
```

**Mínimo obrigatório:**
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (Google Cloud Console)
- `SMTP_*` (para alertas e 2FA por email)

### 3️⃣ Gerar secrets (Docker Secrets)

```bash
mkdir -p apps/backend/secrets

# Gera passwords aleatórias de 32 caracteres
echo "your-secure-jwt-secret-min-32-chars" > apps/backend/secrets/jwt_secret.txt
echo "random-password-auth-db" > apps/backend/secrets/auth_db_password.txt
echo "random-password-redis" > apps/backend/secrets/redis_password.txt

# ... e os restantes (ver .env.example para lista completa)
```

### 4️⃣ Subir infraestrutura

```bash
cd apps/backend

# Desenvolvimento (com hot-reload)
docker compose -f docker-compose.dev.yml up -d

# Ou só um serviço específico e dependências
docker compose -f docker-compose.dev.yml up -d --build auth-service
```

### 5️⃣ Verificar status

```bash
# Ver containers
docker compose -f docker-compose.dev.yml ps

# Ver logs de um serviço
docker compose -f docker-compose.dev.yml logs -f auth-service

# Pingar um endpoint
curl http://localhost:3001/health
# { "status": "ok", "service": "auth-service" }
```

---

## 🔧 Serviços

### 1. **Auth Service** (porta 3001)

**Responsabilidades:**
- Registo e login local
- OAuth2 com Google
- Emissão de JWT
- 2FA com TOTP (Google Authenticator)
- 2FA por Email
- Blacklist de tokens (logout)

**Endpoints principais:**
```
POST   /auth/register           — Cria conta local
POST   /auth/login              — Autentica e emite JWT
POST   /auth/logout             — Invalida token
GET    /auth/me                 — Perfil do utilizador autenticado
POST   /auth/2fa/setup          — Inicia setup TOTP
POST   /auth/2fa/verify         — Confirma código 2FA
POST   /auth/2fa/disable        — Desativa 2FA
GET    /auth/google             — Redirect OAuth Google
GET    /auth/google/callback    — Callback OAuth Google
GET    /health                  — Health check
```

**Base de dados:** `PostgreSQL` (auth)
**Documentação:** [docs/auth-service.md](docs/auth-service.md)
**Docs Interativa:** `http://localhost:3001/docs` (Swagger)

---

### 2. **User Service** (porta 3004)

**Responsabilidades:**
- Gestão de perfis de utilizador
- Avatar e dados públicos
- Histórico e estatísticas

**Base de dados:** `PostgreSQL` (users)
**Deps:** Escuta eventos de `auth-service` via Redis Streams

---

### 3. **Wallet Service** (porta 3005)

**Responsabilidades:**
- Carteira virtual (saldo VAKS)
- Transferências P2P
- Contribuições a campanhas
- Histórico de transações
- Top-up (integração com pagamentos)

**Endpoints principais:**
```
GET    /wallet                  — Carteira do utilizador
GET    /wallet/balance          — Saldo
POST   /wallet/transfer         — Transferência P2P
GET    /wallet/history          — Histórico de transações
POST   /wallet/deposit          — Depósito (admin)
```

**Base de dados:** `PostgreSQL` (wallet)
**Documentação:** [docs/wallet-api.md](docs/wallet-api.md)

---

### 4. **Campaign Service** (porta 3002)

**Responsabilidades:**
- CRUD de campanhas
- Eventos associados
- Estados de campanha (ativa, finalizada, etc.)
- Histórico de contribuições

**Base de dados:** `PostgreSQL` (campaign)
**Documentação:** [docs/vaquinhas-api.md](docs/vaquinhas-api.md)

---

### 5. **Notification Service** (porta 3003)

**Responsabilidades:**
- Notificações in-app
- Email (SMTP)
- 2FA por email
- Eventos via Redis Streams

**Base de dados:** `PostgreSQL` (notification)
**Configuração:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM=noreply@ft-transcendence.com
```

---

### 6. **Ledger Service** (porta 3006) — Blockchain

**Responsabilidades:**
- Integração com Smart Contract ERC-20 (VAKS Token)
- Mint/Burn de tokens on-chain
- Registos imutáveis no blockchain
- Reconciliação com wallet local

**Smart Contract:**
- **Rede:** Avalanche Fuji Testnet
- **Endereço:** `0xc719E0b1488056FF848D5af73910C18b3A83a1e0`
- **Explorer:** https://testnet.snowtrace.io/address/0xc719E0b1488056FF848D5af73910C18b3A83a1e0

**Endpoints:**
```
POST   /api/ledger/mint          — Cria VAKS on-chain
POST   /api/ledger/transfer      — Transfere VAKS on-chain
GET    /api/ledger/balance       — Saldo on-chain
GET    /api/ledger/history       — Histórico blockchain
```

**Base de dados:** `PostgreSQL` (ledger)
**Documentação:** [docs/LEDGER_SERVICE.md](docs/LEDGER_SERVICE.md)

---

### 7. **API Gateway** (porta 3000)

**Responsabilidades:**
- Ponto de entrada único
- Rate limiting global
- Proxy para microserviços
- Autenticação centralizada

**Não expõe nada direto** — apenas encaminha requests para os serviços apropriados.

---

## 📂 Estrutura de Ficheiros

```
Backend/
├── api-gateway/                 # API Gateway (reverse proxy)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── proxy/              # Lógica de encaminhamento
│   │   ├── auth/               # Guards JWT
│   │   └── redis/
│   ├── Dockerfile / Dockerfile.dev
│   └── package.json
│
├── auth-service/                # Autenticação & JWT
│   ├── src/
│   │   ├── main.ts
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/      # Passport: JWT, Google OAuth
│   │   │   ├── guards/          # JwtGuard, GoogleAuthGuard
│   │   │   ├── decorators/
│   │   │   └── dto/             # RegisterDto, LoginDto, etc.
│   │   ├── database/            # PrismaService
│   │   └── redis.service.ts
│   ├── prisma/
│   │   ├── schema.prisma        # User, AuthProvider enum
│   │   └── migrations/
│   ├── Dockerfile / Dockerfile.dev
│   └── package.json
│
├── user-service/                # Perfis de utilizador
│   ├── src/
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── dto/
│   │   ├── events/
│   │   │   └── event-consumer.service.ts  # Escuta user.created
│   │   └── ...
│   ├── prisma/schema.prisma
│   └── package.json
│
├── wallet-service/              # Carteira virtual
│   ├── src/
│   │   ├── wallet/
│   │   │   ├── wallet.controller.ts
│   │   │   ├── wallet.service.ts
│   │   │   └── dto/
│   │   ├── transaction/
│   │   ├── events/
│   │   └── ...
│   ├── prisma/schema.prisma
│   └── package.json
│
├── campaign-service/            # Campanhas
│   ├── src/
│   │   ├── campaign/
│   │   ├── events/
│   │   └── ...
│   ├── prisma/schema.prisma
│   └── package.json
│
├── notification-service/        # Notificações & Email
│   ├── src/
│   │   ├── notifications/
│   │   │   ├── email.service.ts  # SMTP via nodemailer
│   │   │   └── notification.service.ts
│   │   ├── events/
│   │   │   └── event-consumer.service.ts  # Escuta Redis Streams
│   │   └── ...
│   ├── prisma/schema.prisma
│   └── package.json
│
├── ledger-service/              # Blockchain
│   ├── src/
│   │   ├── blockchain/
│   │   │   ├── blockchain.service.ts  # ethers.js
│   │   │   └── abi.json               # Smart Contract ABI
│   │   ├── ledger/
│   │   │   ├── ledger.controller.ts
│   │   │   ├── ledger.service.ts
│   │   │   └── dto/
│   │   ├── events/
│   │   └── ...
│   ├── prisma/schema.prisma
│   └── package.json
│
├── ledger-contracts/            # Smart Contracts (Hardhat)
│   ├── contracts/
│   │   └── VAKSToken.sol        # ERC-20 Token
│   ├── scripts/
│   │   └── deploy.ts            # Deploy script
│   ├── test/
│   │   └── VAKSToken.test.ts
│   ├── hardhat.config.ts
│   └── package.json
│
├── docs/                        # Documentação
│   ├── infrastructure.md        # Arquitetura Docker
│   ├── auth-service.md          # Auth Service detalhado
│   ├── development.md           # Dev containers
│   ├── wallet-api.md            # Wallet API reference
│   ├── LEDGER_SERVICE.md        # Blockchain
│   ├── 2FA_EMAIL_QUICKSTART.md  # 2FA setup
│   ├── FRONTEND_2FA_INTEGRATION.md
│   ├── vaquinhas-api.md         # Campaigns
│   ├── oauth-social-auth.md
│   ├── notifications-api.md
│   └── more...
│
├── secrets/                     # Docker Secrets (não commit)
│   ├── jwt_secret.txt
│   ├── auth_db_password.txt
│   ├── redis_password.txt
│   └── ...
│
├── .env                         # Variáveis (não commit)
├── .env.example                 # Template de exemplo
├── .gitignore
├── docker-compose.yml           # Produção
├── docker-compose.dev.yml       # Desenvolvimento
└── README.md                    # Este ficheiro
```

---

## 🔄 Fluxos Principais

### Fluxo 1: Registo Local → Blockchain

```
Frontend
  │
  ├─► POST /auth/register
  │       ├─ Hash password (bcrypt)
  │       ├─ Cria user em authDb
  │       └─ Publica user.created → Redis Stream
  │
  ├─ User Service (escuta Redis)
  │       ├─ Cria User Profile
  │       ├─ Cria Wallet com saldo 0
  │       └─ Publica user.profile.created
  │
  ├─ Ledger Service (escuta Redis)
  │       ├─ Cria WalletMapping (user → address blockchain)
  │       └─ Está pronto para mint on-chain
  │
  └─ Frontend recebe JWT
          └─ Utilizador autenticado
```

### Fluxo 2: Login com 2FA (TOTP)

```
Frontend
  │
  ├─► POST /auth/login (email + password)
  │       ├─ Valida credenciais
  │       ├─ 2FA ativo?
  │       │   ├─ Sim → gera tempToken (5min, isTwoFA: true)
  │       │   └─ Retorna { requiresTwoFA, tempToken }
  │       └─ Não → gera JWT completo
  │
  ├─ Frontend detecta 2FA necessário
  │       └─ Mostra input de código
  │
  ├─► POST /auth/2fa/validate (tempToken + código TOTP)
  │       ├─ Valida tempToken
  │       ├─ Valida código com otplib
  │       └─ Gera JWT completo
  │
  └─ Frontend armazena JWT
          └─ Requisições autenticadas
```

### Fluxo 3: 2FA por Email

```
Frontend
  │
  ├─► POST /auth/login (email + password)
  │
  ├─ Auth Service
  │       ├─ Gera código 6-dígitos aleatório
  │       ├─ Guarda twoFAEmailCode + expiração (10 min)
  │       └─ Publica 2fa.email.code-generated → Redis Stream
  │
  ├─ Notification Service (event-consumer)
  │       ├─ Recebe evento
  │       ├─ Cria notificação in-app
  │       └─ EmailService.send2FACode() via SMTP
  │
  ├─ Gmail/Mailtrap
  │       └─ Envia email com código
  │
  └─ Frontend recebe código e valida
```

### Fluxo 4: Transferência + Blockchain

```
Alice (Saldo: 1000 VAKS)
  │
  ├─► POST /wallet/transfer
  │       ├─ toWalletId: Bob
  │       ├─ amount: 100
  │
  ├─ Wallet Service
  │       ├─ Valida saldo
  │       ├─ Cria Transaction (status: PENDING)
  │       ├─ Reduz balance Alice (-100)
  │       ├─ Aumenta balance Bob (+100)
  │       └─ Publica wallet.transfer.completed → Redis Stream
  │
  ├─ Ledger Service (event-consumer)
  │       ├─ Recebe wallet.transfer.completed
  │       └─ Chama blockchain: transfer(aliceAddr, bobAddr, 100)
  │              ├─ gas fee pago por admin
  │              └─ txHash + blockNumber
  │
  └─ Ambos os saldos reconciliados
          └─ Local (SQL) + On-chain (blockchain)
```

---

## 🛠️ Desenvolvimento

### Hot-Reload Local

```bash
cd apps/backend

# Subir com hot-reload (NestJS --watch)
docker compose -f docker-compose.dev.yml up --build auth-service

# Editar ficheiro
nano Backend/auth-service/src/auth/auth.controller.ts

# ✅ Auto-recompila e reinicia serviço automaticamente
# Ver logs: docker compose -f docker-compose.dev.yml logs -f auth-service
```

### Rodar Testes

```bash
# Tests unitários
docker exec -it auth-service-dev npm test

# Tests e2e
docker exec -it auth-service-dev npm run test:e2e

# Com cobertura
docker exec -it auth-service-dev npm run test:cov
```

### Prisma Studio (DB GUI)

```bash
# Opção 1: Dentro do container
docker exec -it auth-service-dev npx prisma studio
# Abrirá em http://localhost:5555

# Opção 2: Do host (se BD exposta)
cd Backend/auth-service
DATABASE_URL="postgresql://auth_user:change_me@localhost:5432/auth?schema=public" npx prisma studio
```

### Criar Migration

```bash
docker exec -it auth-service-dev sh

# Dentro do container:
npx prisma migrate dev --name add_new_field

# Migration criada em prisma/migrations/ — sincroniza com host via bind mount
```

### Debug com Swagger/Docs

Cada serviço tem documentação interativa:

- Auth Service: `http://localhost:3001/docs`
- User Service: `http://localhost:3004/docs`
- Wallet Service: `http://localhost:3005/docs`
- Ledger Service: `http://localhost:3006/docs`

**Testar endpoints diretamente no Swagger:**
1. Fazer login em `/auth/login`
2. Copiar o `accessToken`
3. Clicar em "Authorize" (cadeado no topo)
4. Colar token com formato `Bearer <token>`
5. Testar endpoints autenticados

### Conectar ao Banco do Host

```bash
# PostgreSQL (auth)
psql postgresql://auth_user:change_me@localhost:5432/auth

# Query exemplo:
SELECT id, email, username, "twoFAEnabled" FROM "User";

# Ou usar DBeaver / TablePlus GUI
```

### Verificar Redis Streams

```bash
docker exec -it redis-cache-dev redis-cli -a change_me

# Ver streams
XLEN user.created
XRANGE user.created - +

# Ver consumer groups
XINFO GROUPS wallet-events
```

---

## 🚀 Deployment

### Construir para Produção

```bash
# Build das imagens (multi-stage, otimizado)
docker compose build

# Push para registry (ex: Docker Hub)
docker tag auth-service seu-username/auth-service:1.0
docker push seu-username/auth-service:1.0
```

### Deploy em Servidor

```bash
# Copia docker-compose.yml e secrets para servidor
scp -r docker-compose.yml secrets/ user@server:/home/app/

# SSH no servidor
ssh user@server

# Subir stack
cd /home/app
docker compose -f docker-compose.yml up -d

# Verificar
docker ps
docker compose logs -f api-gateway
```

### Variáveis de Produção

**Diferenças vs Desenvolvimento:**

| Aspecto | Dev | Prod |
|---------|-----|------|
| `.env` | Valores test (`change_me`) | valores reais seguros |
| Docker Secrets | Inline no compose | Ficheiros em `/run/secrets/` |
| Portas BDs | Expostas (debug) | Não expostas |
| JWT_SECRET | `change_me` | `echo ... \| openssl rand -base64 32` (32+ chars) |
| LOG_LEVEL | DEBUG | INFO/WARN |

---

## 📚 Documentação Adicional

### Core Topics

| Documento | Conteúdo |
|-----------|----------|
| [docs/infrastructure.md](docs/infrastructure.md) | Arquitetura de containers, redes Docker, isolamento por domínio |
| [docs/auth-service.md](docs/auth-service.md) | Detalhado: JWT, 2FA, OAuth, blacklist, Redis |
| [docs/development.md](docs/development.md) | Dev containers, hot-reload, Prisma, troubleshooting |
| [docs/wallet-api.md](docs/wallet-api.md) | API de carteira, transações, modelos de dados |
| [docs/LEDGER_SERVICE.md](docs/LEDGER_SERVICE.md) | Blockchain, smart contract, setup Avalanche |

### Features

| Documento | Conteúdo |
|-----------|----------|
| [docs/2FA_EMAIL_QUICKSTART.md](docs/2FA_EMAIL_QUICKSTART.md) | 2FA por email: setup SMTP, endpoints, exemplos |
| [docs/FRONTEND_2FA_INTEGRATION.md](docs/FRONTEND_2FA_INTEGRATION.md) | Como integrar 2FA no frontend (React) |
| [docs/oauth-social-auth.md](docs/oauth-social-auth.md) | Google OAuth, configuração, fluxo |
| [docs/wallet-topup-frontend.md](docs/wallet-topup-frontend.md) | Top-up: polling, states, UX |
| [docs/vaquinhas-api.md](docs/vaquinhas-api.md) | Campaign API: CRU operations |
| [docs/notifications-api.md](docs/notifications-api.md) | Sistema de notificações |

### Arquitectura

| Documento | Conteúdo |
|-----------|----------|
| [docs/backend_arquitetura_api_epicos_Version5.md](docs/backend_arquitetura_api_epicos_Version5.md) | Visão geral dos épicos de desenvolvimento |
| [docs/user-social-api.md](docs/user-social-api.md) | API de perfis e social |
| [docs/service-standards.md](docs/service-standards.md) | Padrões de código, conventions |

---

## 🔑 Chaves de Acesso (Dev)

### JSON Web Tokens (JWT)

```bash
# Exemplo de JWT decodificado:
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  # UUID do user
  "email": "user@example.com",
  "username": "john_doe",
  "jti": "b1c2d3e4-f5g6-h7i8-j9k0-l1m2n3o4p5q6",  # ID único do token
  "iat": 1678886400,                              # Issued at
  "exp": 1678890000                               # Expires
}
```

### OAuth Secrets (Dev)

```
GOOGLE_CLIENT_ID:     247700649616-0off5mrsfjra5vef7iabealp5ckicfhn.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET: 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
```

⚠️ **ESTES SÃO PÚBLICOS (DEV) — NÃO USAR EM PRODUÇÃO!**

### Avax Testnet Faucet

Para testar blockchain:

```bash
# Obter AVAX de testnet
https://core.app/tools/testnet-faucet

# Ou usar curl
curl -X POST https://faucet.avax.network/api/GetFaucetWalletPublicKey

# Guardá-lo em .env:
# ADMIN_PRIVATE_KEY=0x...
# AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

---

## ⚠️ Segurança — Boas Práticas

### Passwords & Secrets

```bash
# ❌ ERRADO
DB_PASSWORD=simple123
JWT_SECRET=change_me

# ✅ CORRETO (produção)
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
```

**Nunca commitar:**
- `.env` (variáveis reais)
- `secrets/*.txt` (passwords)
- `client_secret_*.json` (OAuth)

### Rate Limiting

```
POST   /auth/login              — 5 tentativas/minuto (brutal-force protection)
POST   /auth/register           — 30 tentativas/minuto (global)
GET    /*                       — 30 req/minuto (global)
```

### CORS

```
FRONTEND_URL=http://localhost:3001

// Configurado no API Gateway
// Requests de outras origins são bloqueadas
```

### SQL Injection Protection

Todos os serviços usam **Prisma** (não raw SQL):

```typescript
// ✅ SEGURO (Prisma)
const user = await prisma.user.findUnique({ where: { email } });

// ❌ PERIGOSO (SQL raw)
const user = await db.query(`SELECT * FROM user WHERE email = '${email}'`);
```

### Token Expiration

```
JWT Standard:  3600 segundos (1 hora)
2FA Temp Token: 300 segundos (5 minutos)
2FA Email Code: 600 segundos (10 minutos)
```

---

## 🐛 Troubleshooting

### Container reinicia em loop

```bash
# Ver logs
docker compose -f docker-compose.dev.yml logs auth-service

# Causas comuns:
# 1. Prisma migrate falha → check BD está healthy
# 2. Porta já em uso → docker ps | grep 3001
# 3. node_modules incompatível → rebuild: docker compose -f docker-compose.dev.yml up --build --no-cache
```

### Hot-reload não funciona

```bash
# Verificar bin mount
docker exec -it auth-service-dev ls /app/src

# Windows/macOS pode ter atraso de 2s
# Linux deve ser instantâneo

# Forçar rebuild:
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build
```

### Não consigo conectar à BD

```bash
# Verificar se BD está healthy
docker compose -f docker-compose.dev.yml ps

# Se não está healthy, ver logs
docker compose -f docker-compose.dev.yml logs authDb

# Resetar (apagar volumes)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Redis Streams não funciona

```bash
# Verificar se redis está a correr
docker compose -f docker-compose.dev.yml ps redis

# Testar conexão
docker exec -it redis-cache-dev redis-cli -a change_me ping
# → PONG

# Ver streams criados
XLEN user.created
```

### Blockchain: "insufficient funds"

```bash
# Não tens AVAX de testnet

# 1. Ir para https://core.app/tools/testnet-faucet
# 2. Conectar MetaMask com testnet Avalanche
# 3. Requerer AVAX (faucet tem limite de tempo)
# 4. Aguardar ~1 minuto
# 5. Confirmar saldo no MetaMask
```

---

### Comum Problemas

| Erro | Solução |
|------|---------|
| `ECONNREFUSED` | Serviço não está a correr |
| `JWT invalid` | Token expirado ou revogado |
| `Invalid credentials` | Email/password incorretos (msg genérica por segurança) |
| `Rate limit exceeded` | Demasiadas tentativas de login |
| `OnlyAdmin` | Não tem permissões admin na wallet |

---


## 📄 Licença

Projeto desenvolvido para **42 School** — ft_transcendence

---

**Última atualização:** 1 de Abril de 2026
**Versão:** 1.0
