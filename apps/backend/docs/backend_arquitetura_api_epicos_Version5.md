# VAKS — Arquitetura Backend, Endpoints e Épicos

## 1. Arquitetura do Backend

### Stack Tecnológica

- **Backend Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL (database isolada por microserviço)
- **ORM:** Prisma (cada serviço com seu próprio Prisma Client e Schema)
- **Comunicação entre Serviços:**
  - REST API (síncrona)
  - Redis Streams (eventos assíncronos)
- **Real-time:** WebSockets via Socket.io
- **Autenticação:** JWT + bcrypt (hash de passwords) + OAuth 2.0 (Google)
- **2FA:** TOTP (opcional)
- **Cache / Message Broker:** Redis
- **Containerização:** Docker + Docker Compose
- **API Gateway:** NestJS Gateway (ponto único de entrada para o frontend)

---

### Arquitetura de Microserviços

Cada microserviço:

- Roda em **container Docker separado**
- Tem sua **própria base de dados PostgreSQL** (ou schema isolado)
- Possui seu **próprio Prisma Schema e Client**
- **Não acessa diretamente** o banco de outro serviço
- Comunica-se via **REST** (chamadas síncronas) ou **eventos Redis Pub/Sub** (assíncronas)

#### Microserviços:

1. **Auth Service** — Autenticação, registro, JWT, OAuth 2.0 (Google), 2FA
2. **User Service** — Gestão de perfis, avatares, amizades
3. **Wallet Service** — Carteiras digitais, saldo VAKS, transações P2P
4. **Campaign Service** — CRUD de campanhas, membros, convites, permissões
5. **Notification Service** — Notificações in-app, WebSockets, histórico
6. **Ledger Service** (Opcional/Bonus) — Simulação blockchain/Avalanche

---

### Diagrama de Arquitetura

```
                          ┌─────────────────┐
                          │    Frontend     │
                          │   (React/TS)    │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │  API Gateway    │
                          │   (NestJS)      │
                          └────────┬────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼────────┐      ┌──────────▼─────────┐      ┌────────▼────────┐
│  Auth Service  │      │   User Service     │      │ Wallet Service  │
│ ┌────────────┐ │      │  ┌────────────┐    │      │ ┌─────────────┐ │
│ │  Auth DB   │ │      │  │  User DB   │    │      │ │  Wallet DB  │ │
│ └────────────┘ │      │  └────────────┘    │      │ └─────────────┘ │
└────────┬───────┘      └──────────┬─────────┘      └────────┬────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  Redis Pub/Sub  │
                          │ (Event Broker)  │
                          └────────┬────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼──────────┐    ┌──────────▼─────────┐    ┌──────────▼────────┐
│Campaign Service  │    │Notification Service│    │  Ledger Service   │
│ ┌──────────────┐ │    │ ┌────────────────┐ │    │ ┌───────────────┐ │
│ │ Campaign DB  │ │    │ │Notification DB │ │    │ │   Ledger DB   │ │
│ └──────────────┘ │    │ └────────────────┘ │    │ └───────────────┘ │
└──────────────────┘    └────────────────────┘    └───────────────────┘
```

---

### Comunicação entre Microserviços

#### 1. REST API (Síncrona)

Usado quando um serviço precisa de resposta imediata de outro.

**Exemplo:**

- Campaign Service valida se um utilizador existe chamando `GET /users/:id` no User Service.

#### 2. Eventos Assíncronos (Redis Pub/Sub)

Usado para desacoplamento e ações que não precisam de resposta imediata.

**Exemplo de Eventos:**

| Evento                     | Publicado por    | Consumido por                          | Ação                                    |
| -------------------------- | ---------------- | -------------------------------------- | ----------------------------------------- |
| `user.created`           | User Service     | Wallet Service                         | Criar carteira automática                |
| `user.updated`           | User Service     | Campaign Service                       | Atualizar réplica de username            |
| `contribution.completed` | Wallet Service   | Campaign Service, Notification Service | Atualizar progresso, enviar notificação |
| `campaign.created`       | Campaign Service | Notification Service                   | Notificar membros convidados              |
| `wallet.transfer`        | Wallet Service   | Notification Service                   | Notificar remetente/destinatário         |

---

### Estratégia de Dados (Data Management)

Cada serviço mantém:

- **Dados próprios** completos (authoritative data)
- **Réplicas parciais** de dados de outros serviços (sincronizadas via eventos)

**Exemplo:**

- **Campaign Service** guarda:
  - `ownerId` (referência lógica ao User)
  - `ownerUsername` (réplica do username, sincronizada via evento `user.updated`)

Não há **Foreign Keys entre bancos de diferentes serviços**.

---

## 2. Schemas Prisma por Microserviço

### Auth Service Database (`auth-db`)

```prisma
model User {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  username       String    @unique
  hashedPassword String?   // null para contas OAuth
  googleId       String?   @unique // ID do Google OAuth
  twoFASecret    String?
  twoFAEnabled   Boolean   @default(false)
  authProvider   AuthProvider @default(LOCAL)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  sessions       Session[]
}

model Session {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

enum AuthProvider {
  LOCAL
  GOOGLE
}
```

---

### User Service Database (`user-db`)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String   @unique
  avatarUrl String?
  bio       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

### Wallet Service Database (`wallet-db`)

```prisma
model Wallet {
  id           Int           @id @default(autoincrement())
  userId       Int           @unique
  balance      Float         @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  transactions Transaction[]
}

model Transaction {
  id           Int               @id @default(autoincrement())
  fromWalletId Int?
  toWalletId   Int?
  amount       Float
  type         TransactionType
  status       TransactionStatus @default(PENDING)
  metadata     Json?             // ex: { campaignId, campaignTitle }
  createdAt    DateTime          @default(now())
  
  @@index([fromWalletId])
  @@index([toWalletId])
  @@index([createdAt])
}

enum TransactionType {
  P2P_TRANSFER
  CAMPAIGN_CONTRIBUTION
  CAMPAIGN_WITHDRAWAL
  INITIAL_DEPOSIT
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}
```

---

### Campaign Service Database (`campaign-db`)

```prisma
model Campaign {
  id              Int              @id @default(autoincrement())
  title           String
  description     String
  isPrivate       Boolean          @default(false)
  goalAmount      Float?
  goalVisible     Boolean          @default(true)
  currentAmount   Float            @default(0)
  deadline        DateTime?
  ownerId         Int
  ownerUsername   String           // réplica sincronizada
  status          CampaignStatus   @default(ACTIVE)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  closedAt        DateTime?
  members         CampaignMember[]
  invitations     Invitation[]
  
  @@index([ownerId])
  @@index([status])
  @@index([isPrivate])
}

model CampaignMember {
  id         Int        @id @default(autoincrement())
  campaignId Int
  campaign   Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  userId     Int
  username   String     // réplica sincronizada
  role       MemberRole @default(VAKER)
  joinedAt   DateTime   @default(now())
  
  @@unique([campaignId, userId])
  @@index([userId])
}

model Invitation {
  id            Int            @id @default(autoincrement())
  campaignId    Int
  campaign      Campaign       @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  invitedUserId Int?
  invitedEmail  String?
  inviterId     Int
  inviterName   String         // réplica
  status        InviteStatus   @default(PENDING)
  createdAt     DateTime       @default(now())
  respondedAt   DateTime?
  
  @@index([invitedUserId])
  @@index([campaignId])
}

enum CampaignStatus {
  ACTIVE
  COMPLETED
  CANCELLED
  EXPIRED
}

enum MemberRole {
  SUDO
  VAKER
}

enum InviteStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
}
```

---

### Notification Service Database (`notification-db`)

```prisma
model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int
  type      NotificationType
  title     String
  message   String
  metadata  Json?            // dados extras (campaignId, amount, etc)
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  
  @@index([userId, read])
  @@index([createdAt])
}

enum NotificationType {
  CAMPAIGN_CONTRIBUTION
  CAMPAIGN_INVITE
  WALLET_TRANSFER_SENT
  WALLET_TRANSFER_RECEIVED
  CAMPAIGN_GOAL_REACHED
  CAMPAIGN_CLOSED
  MEMBER_PROMOTED
}
```

---

### Ledger Service Database (Bonus — Blockchain simulado)

```prisma
model LedgerEntry {
  id         Int      @id @default(autoincrement())
  userId     Int
  txHash     String   @unique
  amount     Float
  operation  String   // MINT, TRANSFER, BURN
  blockNumber Int?
  metadata   Json?
  createdAt  DateTime @default(now())
  
  @@index([userId])
  @@index([txHash])
}
```

---

## 3. Endpoints da API (por microserviço)

### API Gateway (ponto de entrada unificado)

Todos os requests do frontend passam pelo Gateway, que roteia para o microserviço correto.

---

### Auth Service

| Método | Endpoint                  | Descrição                         |
| ------- | ------------------------- | ----------------------------------- |
| POST    | `/auth/register`        | Registar novo utilizador (local)    |
| POST    | `/auth/login`           | Login tradicional (retorna JWT)     |
| GET     | `/auth/google`          | Iniciar fluxo OAuth Google          |
| GET     | `/auth/google/callback` | Callback OAuth Google (retorna JWT) |
| POST    | `/auth/logout`          | Invalidar sessão                   |
| GET     | `/auth/me`              | Obter utilizador autenticado        |
| POST    | `/auth/2fa/setup`       | Configurar 2FA                      |
| POST    | `/auth/2fa/verify`      | Validar código 2FA                 |
| POST    | `/auth/2fa/disable`     | Desativar 2FA                       |

---

### User Service

| Método | Endpoint              | Descrição                          |
| ------- | --------------------- | ------------------------------------ |
| GET     | `/users/:id`        | Obter perfil público de utilizador  |
| PUT     | `/users/:id`        | Atualizar perfil (username, bio)     |
| POST    | `/users/:id/avatar` | Upload de avatar                     |
| DELETE  | `/users/:id/avatar` | Remover avatar                       |
| GET     | `/users/search`     | Pesquisar utilizadores (query param) |

---

### Wallet Service

| Método | Endpoint                 | Descrição                             |
| ------- | ------------------------ | --------------------------------------- |
| GET     | `/wallet`              | Ver carteira do utilizador autenticado  |
| GET     | `/wallet/balance`      | Ver apenas saldo                        |
| GET     | `/wallet/transactions` | Histórico de transações (paginado)   |
| POST    | `/wallet/transfer`     | Transferir VAKS para outro utilizador   |
| GET     | `/transactions/:id`    | Detalhes de uma transação específica |

---

### Campaign Service

| Método | Endpoint                                   | Descrição                                    |
| ------- | ------------------------------------------ | ---------------------------------------------- |
| GET     | `/campaigns`                             | Listar campanhas públicas (paginado, filtros) |
| POST    | `/campaigns`                             | Criar nova campanha                            |
| GET     | `/campaigns/:id`                         | Detalhes de uma campanha                       |
| PUT     | `/campaigns/:id`                         | Editar campanha (apenas owner/sudo)            |
| DELETE  | `/campaigns/:id`                         | Encerrar campanha                              |
| POST    | `/campaigns/:id/contribute`              | Contribuir para campanha                       |
| GET     | `/campaigns/:id/members`                 | Listar membros                                 |
| POST    | `/campaigns/:id/members/:userId/promote` | Promover membro a SUDO                         |
| DELETE  | `/campaigns/:id/members/:userId`         | Remover membro                                 |
| POST    | `/campaigns/:id/invite`                  | Enviar convite (privada)                       |
| GET     | `/campaigns/:id/invitations`             | Listar convites pendentes                      |
| POST    | `/invitations/:id/accept`                | Aceitar convite                                |
| POST    | `/invitations/:id/reject`                | Rejeitar convite                               |

---

### Notification Service

| Método | Endpoint                    | Descrição                                    |
| ------- | --------------------------- | ---------------------------------------------- |
| GET     | `/notifications`          | Listar notificações do utilizador (paginado) |
| GET     | `/notifications/unread`   | Listar apenas não lidas                       |
| PUT     | `/notifications/:id/read` | Marcar como lida                               |
| PUT     | `/notifications/read-all` | Marcar todas como lidas                        |
| DELETE  | `/notifications/:id`      | Apagar notificação                           |

**WebSocket:**

- `ws://gateway/notifications` — Subscrição para receber notificações em tempo real

---

### Ledger Service (Bonus)

| Método | Endpoint                    | Descrição                         |
| ------- | --------------------------- | ----------------------------------- |
| GET     | `/ledger/balance/:userId` | Ver saldo on-chain                  |
| POST    | `/ledger/mint`            | Criar novos tokens (admin)          |
| POST    | `/ledger/transfer`        | Transferir tokens on-chain          |
| GET     | `/ledger/tx/:hash`        | Detalhes de transação blockchain  |
| GET     | `/ledger/history/:userId` | Histórico de transações on-chain |

---

## 4. Épicos e Entregáveis

### Épico 1: Infraestrutura e Setup Inicial

**Responsável:** Dev 1

**Objetivos:**

- Setup de repositório monorepo ou multi-repo
- Estrutura de pastas para microserviços
- Docker Compose com todos os serviços
- PostgreSQL (6 databases isoladas)
- Redis para Pub/Sub
- API Gateway básico (routing)

**Entregáveis:**

- [ ] `docker-compose.yml` funcional
- [ ] Estrutura de pastas documentada
- [ ] README de setup para desenvolvedores
- [ ] Scripts de inicialização de DBs
- [ ] Configuração de environment variables

---

### Épico 2: Auth Service — Autenticação e Segurança

**Responsável:** Dev 1

**Objetivos:**

- Registro de utilizadores com validação
- Login tradicional com JWT
- **OAuth 2.0 com Google** (fluxo completo)
- Hash de passwords (bcrypt)
- 2FA (TOTP via `speakeasy` ou similar)
- Rate limiting (proteção contra brute-force)
- Publicação de evento `user.created` após registro

**Entregáveis:**

- [ ] Código do Auth Service
- [ ] Prisma schema e migrations
- [ ] Endpoints funcionais (`/auth/*`)
- [ ] Integração OAuth Google (credentials, callback)
- [ ] Documentação de autenticação (Postman/Swagger)
- [ ] Guia de configuração Google OAuth (Client ID/Secret)
- [ ] Testes unitários e de integração
- [ ] Guia de uso do JWT e 2FA

**Dependências Google OAuth:**

- Credenciais OAuth 2.0 no Google Cloud Console
- Redirect URI configurado
- Scopes: `profile`, `email`

---

### Épico 3: User Service — Gestão de Perfis

**Responsável:** Dev 2

**Objetivos:**

- CRUD de utilizadores
- Upload e gestão de avatares
- Publicação de evento `user.created`, `user.updated`
- Listener para evento `user.created` do Auth Service (criar perfil completo)

**Entregáveis:**

- [ ] Código do User Service
- [ ] Prisma schema e migrations
- [ ] Endpoints funcionais (`/users/*`)
- [ ] Sistema de upload de ficheiros (local ou S3)
- [ ] Event publisher (Redis)
- [ ] Event listener (sincronização com Auth)
- [ ] Documentação de endpoints
- [ ] Testes

---

### Épico 4: Wallet Service — Carteira Digital e Transações

**Responsável:** Dev 1

**Objetivos:**

- Criação automática de carteira (listener de `user.created`)
- Gestão de saldo VAKS
- Transferências P2P
- Proteção contra double-spending (transações atômicas)
- Histórico de transações
- Publicação de eventos `contribution.completed`, `transfer.completed`

**Entregáveis:**

- [ ] Código do Wallet Service
- [ ] Prisma schema e migrations
- [ ] Endpoints funcionais (`/wallet/*`)
- [ ] Event listeners (user.created)
- [ ] Event publishers
- [ ] Documentação de lógica anti-double-spending
- [ ] Testes de concorrência
- [ ] Logs de auditoria

---

### Épico 5: Campaign Service — Gestão de Campanhas

**Responsável:** Dev 2

**Objetivos:**

- CRUD de campanhas (públicas e privadas)
- Sistema de convites
- Gestão de membros e permissões (SUDO/VAKER)
- Contribuições (integração com Wallet Service via REST + eventos)
- Atualização de progresso em tempo real
- Listeners para sincronizar dados de utilizadores

**Entregáveis:**

- [ ] Código do Campaign Service
- [ ] Prisma schema e migrations
- [ ] Endpoints funcionais (`/campaigns/*`)
- [ ] Lógica de permissões (guards)
- [ ] Event listeners (user.updated, contribution.completed)
- [ ] Event publishers (campaign.created, goal.reached)
- [ ] Documentação de fluxos de permissões
- [ ] Testes

---

### Épico 6: Notification Service — Notificações e Real-Time

**Responsável:** Dev 1

**Objetivos:**

- Sistema de notificações in-app
- WebSocket Gateway (Socket.io)
- Listeners para eventos de outros serviços
- Envio de notificações em tempo real
- Gestão de histórico (read/unread)

**Entregáveis:**

- [ ] Código do Notification Service
- [ ] Prisma schema e migrations
- [ ] WebSocket Gateway configurado
- [ ] Event listeners (contribution, campaign, transfer)
- [ ] Endpoints de notificações (`/notifications/*`)
- [ ] Documentação de eventos WebSocket
- [ ] Exemplos de payloads
- [ ] Testes

---

### Épico 7: API Gateway e Orquestração

**Responsável:** Dev 1

**Objetivos:**

- Gateway unificado (NestJS)
- Roteamento para microserviços
- Autenticação centralizada (validação de JWT)
- CORS, rate limiting global
- Logging centralizado
- Health checks

**Entregáveis:**

- [ ] Código do API Gateway
- [ ] Configuração de rotas
- [ ] Middleware de autenticação
- [ ] Rate limiting
- [ ] Documentação de arquitetura
- [ ] Swagger/OpenAPI consolidado

---

### Épico 8: Segurança e Conformidade

**Responsável:** Dev 2

**Objetivos:**

- Validação e sanitização de inputs (class-validator, class-transformer)
- Rate limiting por endpoint
- Logs de auditoria (quem fez o quê, quando)
- Proteção contra SQL injection (Prisma já protege)
- Proteção contra XSS, CSRF
- Testes de segurança

**Entregáveis:**

- [ ] Implementação de validação em todos os endpoints
- [ ] Rate limiting configurado
- [ ] Audit logs persistidos
- [ ] Documentação de práticas de segurança
- [ ] Relatório de testes de segurança
- [ ] Guia de boas práticas

---

### Épico 9 (Bonus): Ledger Service — Blockchain Simulado/Avalanche

**Responsável:** Dev 1 + Dev 2

**Objetivos:**

- Smart contract em Solidity (ERC-20 like)
- Deploy em Avalanche Testnet (Fuji)
- Integração entre Wallet Service e blockchain
- Mint, transfer, balanceOf on-chain
- Explorador básico de transações

**Entregáveis:**

- [ ] Smart contract (Solidity)
- [ ] Scripts de deploy (Hardhat/Foundry)
- [ ] Código do Ledger Service (NestJS)
- [ ] Endpoints blockchain (`/ledger/*`)
- [ ] Documentação de integração
- [ ] Exemplos de transações
- [ ] Screenshots do explorador (Snowtrace)

---

## 5. Cronograma (1 Mês — 2 Devs)

### Semana 1: Fundações

- **Dev 1:**
  - Docker Compose, PostgreSQL, Redis setup
  - Auth Service (registro, login tradicional, JWT)
  - Início OAuth Google (configuração Google Cloud Console)
- **Dev 2:**
  - Estrutura de pastas, scripts iniciais
  - User Service (CRUD básico)
  - Event listeners (user.created)

### Semana 2: Core Features & OAuth

- **Dev 1:**
  - Completar OAuth Google (callback, integração)
  - Wallet Service (criação de carteira, transações P2P)
  - Event bus setup (Redis Pub/Sub)
- **Dev 2:**
  - Campaign Service (CRUD de campanhas)
  - Sistema de convites básico
  - Upload de avatares

### Semana 3: Integração e Real-Time

- **Dev 1:**
  - Notification Service + WebSockets
  - API Gateway (routing, autenticação centralizada)
  - Proteção double-spending
- **Dev 2:**
  - Permissões e hierarquia (SUDO/VAKER)
  - Event listeners (sincronização de dados)
  - Contribuições para campanhas

### Semana 4: Polimento, Segurança e Deploy

- **Dev 1:**
  - Rate limiting, health checks
  - Testes de integração
  - CI/CD e deploy
- **Dev 2:**
  - Validação de inputs, sanitização
  - Logs de auditoria
  - Documentação completa (Swagger, README)
- **Ambos:**
  - Testes finais E2E
  - (Opcional) Ledger Service/Blockchain

---

## 6. Integração OAuth 2.0 com Google

### Configuração Necessária

**Google Cloud Console:**

1. Criar projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. Ativar Google+ API
3. Criar credenciais OAuth 2.0
4. Configurar tela de consentimento
5. Adicionar Redirect URI: `http://localhost:3000/auth/google/callback` (dev) e URL de produção

**Environment Variables:**

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Fluxo OAuth Google

1. **Frontend:** Redireciona para `GET /auth/google`
2. **Auth Service:** Redireciona para Google OAuth
3. **Google:** Utilizador autoriza a aplicação
4. **Google:** Redireciona para `/auth/google/callback?code=...`
5. **Auth Service:**
   - Troca `code` por access token
   - Obtém perfil do utilizador (email, nome, foto)
   - Verifica se utilizador já existe (por `googleId` ou `email`)
   - Se não existe: cria novo utilizador, publica `user.created`
   - Gera JWT
   - Retorna JWT ao frontend

### Bibliotecas NestJS

- `@nestjs/passport`
- `passport`
- `passport-google-oauth20`

### Exemplo de Guard (simplificado)

```typescript
// auth.service.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;
  
    const user = await this.authService.validateOAuthUser({
      googleId: id,
      email: emails[0].value,
      username: displayName,
      avatarUrl: photos[0].value,
    });

    done(null, user);
  }
}
```

---

## 7. Boas Práticas e Observações

### Comunicação entre Serviços

- **REST:** Validação imediata, dados críticos
- **Eventos:** Sincronização de réplicas, notificações

### Transações Distribuídas

- Usar padrão **Saga** para operações que envolvem múltiplos serviços
- Exemplo: Contribuição para campanha
  1. Wallet Service deduz saldo
  2. Publica `contribution.completed`
  3. Campaign Service atualiza progresso
  4. Se falhar, Wallet Service reverte (evento `contribution.failed`)

### OAuth e Segurança

- **Nunca** expor Client Secret no frontend
- Validar sempre o `state` parameter (CSRF protection)
- Usar HTTPS em produção
- Tokens OAuth devem ser armazenados de forma segura (não usados diretamente, apenas para criar JWT próprio)

### Testes

- **Unitários:** Lógica de negócio isolada
- **Integração:** Fluxos completos (ex: registro → criação de wallet)
- **E2E:** Fluxos críticos via API Gateway (incluindo OAuth mock)

### Documentação

- Cada serviço tem README próprio
- Swagger/OpenAPI por serviço
- Diagramas de sequência para fluxos complexos (especialmente OAuth)
- Exemplos de requests/responses

### Monitorização

- Health checks em todos os serviços
- Logs centralizados (considerar ELK stack ou similar)
- Métricas (Prometheus + Grafana para produção)

---

## 8. Tecnologias Finais (Resumo)

| Camada             | Tecnologia                            |
| ------------------ | ------------------------------------- |
| Framework          | NestJS (TypeScript)                   |
| Database           | PostgreSQL (6 databases isoladas)     |
| ORM                | Prisma                                |
| Autenticação     | JWT + bcrypt + OAuth 2.0 (Google)     |
| OAuth              | Passport.js + passport-google-oauth20 |
| 2FA                | speakeasy (TOTP)                      |
| Cache/Events       | Redis (Pub/Sub)                       |
| WebSockets         | Socket.io                             |
| Containerização  | Docker + Docker Compose               |
| API Gateway        | NestJS Gateway                        |
| Blockchain (Bonus) | Avalanche (Fuji Testnet) + Solidity   |
| Testes             | Jest + Supertest                      |
| Documentação     | Swagger/OpenAPI                       |

---

**Este documento serve como guia mestre da arquitetura backend do VAKS. Cada épico deve gerar documentação técnica complementar detalhada.**
