## Issue #3: [EPIC] User Service — Gestão de Perfis

**Labels:** `epic`, `backend`, `users`, `priority:high`
**Assignee:** Dev 2
**Milestone:** Semana 1--2

### Descrição

Implementação do User Service: CRUD de perfis, upload de avatares, pesquisa de utilizadores e sincronização de dados via eventos.

### Critérios de Aceitação

#### CRUD de Perfis

- [ ] `GET /users/:id` — retorna perfil público
- [ ] `PUT /users/:id` — atualiza perfil (apenas próprio utilizador)
  - [ ] Username validado (3-30 chars, único)
  - [ ] Bio opcional (max 500 chars)
- [ ] `GET /users/search?q=...&page=1&limit=10` — pesquisa por username/email

#### Avatar

- [ ] `POST /users/:id/avatar` — upload (multipart/form-data)
  - [ ] Aceita JPG e PNG
  - [ ] Max 5MB
  - [ ] Validação server-side (tipo, tamanho, formato)
  - [ ] Armazenamento seguro com acesso controlado
- [ ] `DELETE /users/:id/avatar` — remove avatar
- [ ] Avatar default quando nenhum fornecido

#### Eventos

- [ ] Listener `user.created` (do Auth Service) → cria perfil no User DB
- [ ] Publica `user.updated` quando perfil é editado

### Prisma Schema

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

### Verificação

```bash
# Obter perfil
curl http://localhost:4000/api/users/1
# → 200 { success: true, data: { id: 1, username: "...", ... } }

# Atualizar perfil
curl -X PUT http://localhost:4000/api/users/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"newname","bio":"Nova bio"}'

# Upload avatar
curl -X POST -F "avatar=@photo.jpg" \
  -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/users/1/avatar

# Upload inválido
curl -X POST -F "avatar=@file.exe" \
  -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/users/1/avatar
# → 400 VALIDATION_ERROR

# Pesquisa
curl "http://localhost:4000/api/users/search?q=john&page=1&limit=10"
```

### Entregáveis

- [ ] Código do User Service
- [ ] Prisma schema + migrations
- [ ] Endpoints funcionais (`/users/*`)
- [ ] Sistema de upload de ficheiros
- [ ] Event listener (`user.created`) + publisher (`user.updated`)
- [ ] Documentação Swagger
- [ ] Testes
- [ ] Documentação técnica do épico

### Módulos ft_transcendence cobertos

- [MAJOR] Gestão de Utilizadores e Autenticação (parcial)
- [MINOR] Upload e Gestão de Ficheiros
- [MINOR] Pesquisa Avançada (parcial)

## Issue #5: [EPIC] Campaign Service — Gestão de Campanhas

**Labels:** `epic`, `backend`, `campaigns`, `priority:critical`
**Assignee:** Dev 2
**Milestone:** Semana 2–3

### Descrição

Implementação do Campaign Service: CRUD de campanhas (públicas e privadas), sistema de convites, gestão de membros e permissões (SUDO/VAKER), contribuições e progresso.

### Critérios de Aceitação

#### CRUD de Campanhas

- [ ] `POST /campaigns` — criar campanha
  - [ ] Title: 5-100 chars
  - [ ] Description: 20-5000 chars
  - [ ] `isPrivate`: boolean
  - [ ] `goalAmount`: opcional, > 0
  - [ ] `deadline`: opcional, data futura
  - [ ] Criador automaticamente adicionado como SUDO
- [ ] `GET /campaigns` — listar públicas (paginado, filtros, ordenação)
  - [ ] Filtro por `status`, `search`
  - [ ] Ordenação por `createdAt`, `currentAmount`
  - [ ] Paginação com metadata
- [ ] `GET /campaigns/:id` — detalhes
  - [ ] Pública: acessível a todos
  - [ ] Privada: apenas membros (403 se não for membro)
- [ ] `PUT /campaigns/:id` — editar (apenas owner/SUDO)
- [ ] `DELETE /campaigns/:id` — encerrar (apenas owner)

#### Contribuições

- [ ] `POST /campaigns/:id/contribute` — contribuir com VAKS
  - [ ] Valida campanha ACTIVE
  - [ ] Se privada, valida que user é membro
  - [ ] Chama Wallet Service via REST para deduzir saldo
  - [ ] Atualiza `currentAmount`
  - [ ] Se atingiu meta → publica `goal.reached`

#### Membros (Privadas)

- [ ] `GET /campaigns/:id/members` — listar membros (paginado)
- [ ] `POST /campaigns/:id/members/:userId/promote` — promover a SUDO
  - [ ] Apenas owner ou SUDO pode promover
- [ ] `DELETE /campaigns/:id/members/:userId` — remover membro
  - [ ] Apenas owner ou SUDO pode remover
  - [ ] Não pode remover o owner

#### Convites (Privadas)

- [ ] `POST /campaigns/:id/invite` — enviar convite
  - [ ] Por `userId` ou `email`
  - [ ] Apenas SUDO ou owner pode convidar
- [ ] `GET /campaigns/:id/invitations` — listar convites
- [ ] `POST /invitations/:id/accept` — aceitar convite
  - [ ] Cria CampaignMember com role VAKER
- [ ] `POST /invitations/:id/reject` — rejeitar convite

#### Permissões (Guards)

- [ ] Owner: CRUD total, promover, remover, encerrar
- [ ] SUDO: editar, convidar, promover VAKER, remover VAKER
- [ ] VAKER: contribuir, ver progresso e membros
- [ ] Utilizador externo (público): contribuir em públicas, ver detalhes
- [ ] Guards implementados no backend (retorna 403 se sem permissão)

#### Eventos

- [ ] Listener: `user.updated` → atualiza réplica de username/avatar nos membros
- [ ] Listener: `contribution.completed` → atualiza `currentAmount`
- [ ] Publica: `campaign.created`, `campaign.closed`, `goal.reached`

### Prisma Schema

```prisma
model Campaign {
  id            Int              @id @default(autoincrement())
  title         String
  description   String
  isPrivate     Boolean          @default(false)
  goalAmount    Float?
  goalVisible   Boolean          @default(true)
  currentAmount Float            @default(0)
  deadline      DateTime?
  ownerId       Int
  ownerUsername String
  status        CampaignStatus   @default(ACTIVE)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  closedAt      DateTime?
  members       CampaignMember[]
  invitations   Invitation[]

  @@index([ownerId])
  @@index([status])
  @@index([isPrivate])
}

model CampaignMember {
  id         Int        @id @default(autoincrement())
  campaignId Int
  campaign   Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  userId     Int
  username   String
  role       MemberRole @default(VAKER)
  joinedAt   DateTime   @default(now())

  @@unique([campaignId, userId])
  @@index([userId])
}

model Invitation {
  id            Int          @id @default(autoincrement())
  campaignId    Int
  campaign      Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  invitedUserId Int?
  invitedEmail  String?
  inviterId     Int
  inviterName   String
  status        InviteStatus @default(PENDING)
  createdAt     DateTime     @default(now())
  respondedAt   DateTime?

  @@index([invitedUserId])
  @@index([campaignId])
}

enum CampaignStatus { ACTIVE COMPLETED CANCELLED EXPIRED }
enum MemberRole { SUDO VAKER }
enum InviteStatus { PENDING ACCEPTED REJECTED CANCELLED }
```

### Verificação

```bash
# Criar campanha pública
curl -X POST http://localhost:4000/api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ajuda Médica","description":"Campanha para tratamento...","isPrivate":false,"goalAmount":5000}'
# → 201

# Listar com filtros
curl "http://localhost:4000/api/campaigns?status=ACTIVE&search=ajuda&page=1&limit=10"

# Contribuir
curl -X POST http://localhost:4000/api/campaigns/1/contribute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":150,"message":"Boa sorte!"}'

# VAKER tenta promover → 403
curl -X POST http://localhost:4000/api/campaigns/1/members/5/promote \
  -H "Authorization: Bearer <vaker_token>"
# → 403 FORBIDDEN

# SUDO promove → 200
curl -X POST http://localhost:4000/api/campaigns/1/members/5/promote \
  -H "Authorization: Bearer <sudo_token>"
# → 200
```

### Entregáveis

- [ ] Código do Campaign Service
- [ ] Prisma schema + migrations
- [ ] Todos os endpoints funcionais
- [ ] Guards de permissões
- [ ] Event listeners + publishers
- [ ] Documentação de fluxos de permissões
- [ ] Testes
- [ ] Documentação técnica do épico

### Módulos ft_transcendence cobertos

- [MAJOR] Sistema de Permissões Avançado
- [MAJOR] Sistema de Organizações (campanhas privadas como "organizações")
- [MINOR] Pesquisa Avançada (listagem com filtros, paginação, ordenação)



## Issue #8: [EPIC] Segurança e Conformidade

**Labels:** `epic`, `security`, `priority:high`
**Assignee:** Dev 2
**Milestone:** Semana 4

### Descrição

Implementação transversal de segurança: validação de inputs, sanitização, rate limiting por endpoint, logs de auditoria, proteção contra vulnerabilidades comuns.

### Critérios de Aceitação

#### Validação

- [ ] `class-validator` + `class-transformer` em todos os DTOs
- [ ] Validação de todos os inputs em todos os endpoints
- [ ] Mensagens de erro claras com campo e motivo
- [ ] Rejeição de campos desconhecidos (whitelist)

#### Sanitização

- [ ] Strip HTML de todos os inputs de texto
- [ ] Proteção contra XSS
- [ ] Proteção contra SQL injection (Prisma já cobre, mas validar)

#### Logs de Auditoria

- [ ] Log de todas as ações críticas:
  - [ ] Criação/edição/remoção de campanhas
  - [ ] Transferências de VAKS
  - [ ] Contribuições
  - [ ] Promoções de membros
  - [ ] Login/logout
- [ ] `GET /audits` — endpoint admin para consultar logs
- [ ] Logs persistidos com: quem, o quê, quando, IP

#### Proteção

- [ ] CORS configurado corretamente
- [ ] Helmet.js integrado (headers de segurança)
- [ ] CSRF protection (se aplicável)
- [ ] Validação de `state` parameter no OAuth (CSRF)
- [ ] Client Secret nunca exposto no frontend
- [ ] HTTPS obrigatório em produção

### Verificação

```bash
# Input inválido → erro detalhado
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","username":"a","password":"123"}'
# → 422 { error: { code: "VALIDATION_ERROR", details: [...] } }

# XSS attempt
curl -X POST http://localhost:4000/api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"<script>alert(1)</script>","description":"test..."}'
# → title sanitizado ou rejeitado

# Logs de auditoria
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:4000/api/audits
# → lista de ações auditadas
```

### Entregáveis

- [ ] Validação implementada em todos os endpoints
- [ ] Rate limiting configurado
- [ ] Audit logs persistidos
- [ ] Documentação de práticas de segurança
- [ ] Relatório de testes de segurança
- [ ] Guia de boas práticas
- [ ] Documentação técnica do épico

### Módulos ft_transcendence cobertos

- Segurança transversal a todos os módulos

---

## Issue #9: [EPIC] [BONUS] Ledger Service — Blockchain Simulado / Avalanche

**Labels:** `epic`, `backend`, `blockchain`, `bonus`, `priority:low`
**Assignee:** Dev 1 + Dev 2
**Milestone:** Semana 4 (se tempo permitir)

### Descrição

Implementação do Ledger Service: smart contract Solidity ERC-20 like, deploy em Avalanche Fuji Testnet, integração com Wallet Service, mint/transfer/balanceOf on-chain.

### Critérios de Aceitação

#### Smart Contract (Solidity)

- [ ] Contrato ERC-20 like (ou custom) com:
  - [ ] `mint(address to, uint256 amount)` — apenas admin
  - [ ] `transfer(address to, uint256 amount)` — qualquer holder
  - [ ] `balanceOf(address owner)` — consulta pública
  - [ ] Eventos: `Transfer`, `Mint`
- [ ] Deploy em Avalanche Fuji Testnet
- [ ] Contrato verificado no Snowtrace

#### Ledger Service (NestJS)

- [ ] `GET /ledger/balance/:userId` — saldo on-chain
- [ ] `POST /ledger/mint` — criar tokens (admin)
- [ ] `POST /ledger/transfer` — transferir tokens on-chain
- [ ] `GET /ledger/tx/:hash` — detalhes de transação
- [ ] `GET /ledger/history/:userId` — histórico on-chain (paginado)

#### Integração

- [ ] Wallet Service sincroniza com Ledger Service
- [ ] Todas as transações registadas on-chain
- [ ] Integridade, auditabilidade e imutabilidade garantidas

### Prisma Schema

```prisma
model LedgerEntry {
  id          Int      @id @default(autoincrement())
  userId      Int
  txHash      String   @unique
  amount      Float
  operation   String
  blockNumber Int?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([txHash])
}
```

### Verificação

```bash
# Deploy
npx hardhat run scripts/deploy.ts --network fuji
# → Contract deployed at: 0x...

# Snowtrace
open https://testnet.snowtrace.io/address/<contract_address>

# Mint
curl -X POST http://localhost:4000/api/ledger/mint \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"toUserId":1,"amount":1000}'

# Balance
curl http://localhost:4000/api/ledger/balance/1
# → { balance: 1000, walletAddress: "0x..." }

# Transfer
curl -X POST http://localhost:4000/api/ledger/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"toUserId":2,"amount":100}'
# → { txHash: "0x...", explorerUrl: "https://testnet.snowtrace.io/tx/0x..." }
```

### Entregáveis

- [ ] Smart contract (Solidity)
- [ ] Scripts de deploy (Hardhat/Foundry)
- [ ] Código do Ledger Service (NestJS)
- [ ] Endpoints blockchain
- [ ] Documentação de integração
- [ ] Exemplos de transações
- [ ] Screenshots do Snowtrace
- [ ] Documentação técnica do épico

### Módulos ft_transcendence cobertos

- [MAJOR] Simulated Cryptocurrency Ledger on Blockchain
