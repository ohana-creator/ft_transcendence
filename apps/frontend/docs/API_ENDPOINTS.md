# API Endpoints - Backend Routes

> Documento gerado a partir da análise do código do frontend.
> Base URL: `http://localhost:3001` (env: `NEXT_PUBLIC_API_URL`)

---

## 1. AUTH — Autenticação

```
POST /auth/register
POST /auth/login
GET  /auth/me
```

### POST /auth/register
> Página: `app/auth/register/page.tsx`

**Request:**
```json
{
  "email": "user@example.com",
  "username": "melzira_ebo",
  "phone": "+244 999 999 999",
  "birthDate": "2005-11-17",
  "password": "senha123",
  "confirmPassword": "senha123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Melzira Ebo",
    "email": "user@example.com",
    "username": "melzira_ebo",
    "avatarUrl": null,
    "saldoVaks": 0,
    "token": "jwt-token-aqui"
  }
}
```

### POST /auth/login
> Página: `app/auth/login/page.tsx`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Melzira Ebo",
    "email": "user@example.com",
    "username": "melzira_ebo",
    "avatarUrl": null,
    "saldoVaks": 12500.00,
    "token": "jwt-token-aqui"
  }
}
```

### GET /auth/me
> Usado para validar sessão e obter dados do utilizador logado

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Melzira Ebo",
    "email": "user@example.com",
    "username": "melzira_ebo",
    "avatarUrl": null,
    "saldoVaks": 12500.00
  }
}
```

---

## 2. PERFIL — Utilizador

```
GET  /users/:id
PUT  /users/:id
```

### GET /users/:id
> Página: `app/(app)/perfil/page.tsx`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Melzira",
    "lastName": "Ebo",
    "dob": "17-11-2005",
    "email": "user@example.com",
    "phone": "+244 999 999 999",
    "username": "melzira_ebo",
    "avatarUrl": null,
    "saldoVaks": 12500.00
  }
}
```

### PUT /users/:id
> Página: `app/(app)/perfil/page.tsx` — botão "Guardar" ao editar

**Request:**
```json
{
  "firstName": "Melzira",
  "lastName": "Ebo",
  "dob": "17-11-2005",
  "email": "user@example.com",
  "phone": "+244 999 999 999",
  "username": "melzira_ebo"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...utilizador atualizado..." }
}
```

---

## 3. CONFIGURAÇÕES

```
GET  /users/:id/settings
PUT  /users/:id/settings
```

### GET /users/:id/settings
> Página: `app/(app)/config/page.tsx`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": {
      "contributions": true,
      "goalReached": true,
      "newMembers": true,
      "email": false
    },
    "privacy": {
      "profilePublic": true,
      "showBalance": false,
      "showContributions": true
    },
    "appearance": {
      "theme": "light",
      "language": "pt"
    }
  }
}
```

### PUT /users/:id/settings
> Página: `app/(app)/config/page.tsx`

**Request:** (mesmo formato da response acima)

**Response (200):**
```json
{
  "success": true,
  "message": "Configurações atualizadas"
}
```

---

## 4. CARTEIRA (Wallet)

```
GET  /wallet
POST /wallet/transfer
```

### GET /wallet
> Página: `app/(app)/carteira/page.tsx` — hook `useCarteira()`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "usuarioId": "uuid",
    "saldo": 12500.00,
    "saldoPendente": 800.00,
    "transacoes": [
      {
        "id": "uuid",
        "tipo": "contribuicao",
        "valor": 500,
        "descricao": "Viagem para Portugal",
        "origem": "Melzira Ebo",
        "destino": "Viagem para Portugal",
        "status": "concluida",
        "criadoEm": "2026-03-09T14:32:00Z"
      },
      {
        "id": "uuid",
        "tipo": "recebimento",
        "valor": 200,
        "descricao": "Presente da turma",
        "origem": "Presente da turma",
        "destino": "Melzira Ebo",
        "status": "concluida",
        "criadoEm": "2026-03-09T09:15:00Z"
      },
      {
        "id": "uuid",
        "tipo": "transferencia",
        "valor": 300,
        "descricao": "Transferência para João Mendes",
        "origem": "Melzira Ebo",
        "destino": "João Mendes",
        "status": "concluida",
        "criadoEm": "2026-03-08T18:45:00Z"
      }
    ]
  }
}
```

**Tipos possíveis de `tipo`:** `"contribuicao"` | `"transferencia"` | `"recebimento"` | `"cashback"`
**Tipos possíveis de `status`:** `"pendente"` | `"concluida"` | `"falhou"`

### POST /wallet/transfer
> Componente: `components/carteira/TransferirVAKS.tsx`

**Request:**
```json
{
  "destinatario": "username_ou_email",
  "valor": 300.00,
  "nota": "Mensagem opcional"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tipo": "transferencia",
    "valor": 300.00,
    "descricao": "Transferência para João Mendes",
    "status": "concluida",
    "criadoEm": "2026-03-09T14:32:00Z"
  }
}
```

---

## 5. CAMPANHAS / VAQUINHAS

```
GET    /campaigns
GET    /campaigns/:id
POST   /campaigns
PUT    /campaigns/:id
DELETE /campaigns/:id
```

### GET /campaigns
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `listPrivateCampaigns()`
> Páginas: `app/(app)/vaquinhas/page.tsx`, `app/(app)/vaquinhas/publicas/page.tsx`, `app/(app)/vaquinhas/privadas/page.tsx`

**Query Params:**
```
?page=1&limit=20&status=ACTIVE&isPrivate=true
?categoria=Solidariedade&busca=viagem&ordenacao=recentes
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Viagem para Portugal",
      "description": "Vamos organizar a melhor viagem!",
      "isPrivate": true,
      "goalAmount": 5000.00,
      "currentAmount": 3200.00,
      "goalVisible": true,
      "deadline": "2026-06-30T23:59:59Z",
      "status": "ACTIVE",
      "categoria": "Eventos",
      "imagemUrl": null,
      "ownerId": 1,
      "ownerUsername": "joao",
      "memberCount": 8,
      "contributionCount": 24,
      "criadoEm": "2026-01-10T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

### GET /campaigns/:id
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `getCampaignDetails()`
> Páginas: `app/(app)/vaquinhas/[id]/page.tsx`, `app/(app)/vaquinhas/privadas/[id]/page.tsx`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Viagem para Portugal",
    "description": "Vamos organizar a melhor viagem!",
    "isPrivate": true,
    "goalAmount": 5000.00,
    "currentAmount": 3200.00,
    "goalVisible": true,
    "deadline": "2026-06-30T23:59:59Z",
    "minContribution": 10.00,
    "status": "ACTIVE",
    "categoria": "Eventos",
    "imagemUrl": null,
    "ownerId": 1,
    "ownerUsername": "joao",
    "memberCount": 8,
    "contributionCount": 24,
    "role": "OWNER",
    "criadoEm": "2026-01-10T12:00:00Z"
  }
}
```

**Nota:** O campo `role` indica o papel do utilizador logado nesta campanha: `"OWNER"` | `"SUDO"` | `"VAKER"` | `null` (se não for membro).

### POST /campaigns
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `createCampaign()`
> Páginas: `app/(app)/vaquinhas/privadas/criar/page.tsx`, `app/(app)/vaquinhas/publicas/criar/page.tsx`

**Request (Vaquinha Privada):**
```json
{
  "title": "Viagem para Portugal",
  "description": "Vamos organizar a melhor viagem!",
  "isPrivate": true,
  "goalAmount": 5000.00,
  "goalVisible": true,
  "deadline": "2026-06-30",
  "minContribution": 10.00,
  "membersToInvite": ["email1@ex.com", "email2@ex.com"],
  "imageUrl": "base64_ou_url"
}
```

**Request (Vaquinha Pública):**
```json
{
  "title": "Material Escolar para Todos",
  "description": "Ajudar crianças com material escolar",
  "isPrivate": false,
  "goalAmount": 2000.00,
  "goalVisible": true,
  "deadline": "2026-12-31",
  "minContribution": 5.00,
  "categoria": "Solidariedade",
  "imageUrl": "base64_ou_url"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "...campanha criada com id..." }
}
```

### PUT /campaigns/:id
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `updateCampaign()`
> Componente: `components/GerirConfiguracoesModal.tsx`

**Request:**
```json
{
  "title": "Título atualizado",
  "description": "Descrição atualizada",
  "goalAmount": 6000.00,
  "goalVisible": false,
  "deadline": "2026-09-30"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...campanha atualizada..." }
}
```

### DELETE /campaigns/:id
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `closeCampaign()`

**Response (200):**
```json
{
  "success": true,
  "message": "Campanha encerrada"
}
```

---

## 6. MEMBROS

```
GET    /campaigns/:id/members
POST   /campaigns/:id/members/:userId/promote
DELETE /campaigns/:id/members/:userId
```

### GET /campaigns/:id/members
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `listMembers()`
> Componente: `components/GerirMembrosModal.tsx`

**Query Params:** `?page=1&limit=20`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "username": "joao",
      "avatarUrl": null,
      "role": "OWNER",
      "joinedAt": "2026-01-10T12:00:00Z"
    },
    {
      "id": 2,
      "userId": 3,
      "username": "carla",
      "avatarUrl": null,
      "role": "VAKER",
      "joinedAt": "2026-01-12T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

**Roles possíveis:** `"OWNER"` | `"SUDO"` | `"VAKER"`

### POST /campaigns/:id/members/:userId/promote
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `promoteMember()`
> Permissão: Apenas OWNER

**Response (200):**
```json
{
  "success": true,
  "message": "Membro promovido a SUDO"
}
```

### DELETE /campaigns/:id/members/:userId
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `removeMember()`
> Permissão: Apenas OWNER

**Response (200):**
```json
{
  "success": true,
  "message": "Membro removido"
}
```

---

## 7. CONVITES

```
POST /campaigns/:id/invite
GET  /campaigns/:id/invitations
POST /invitations/:inviteId/accept
POST /invitations/:inviteId/reject
```

### POST /campaigns/:id/invite
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `sendInvite()`
> Componentes: `GerirMembrosModal.tsx`, `GerirConvitesModal.tsx`
> Permissão: OWNER ou SUDO

**Request:**
```json
{
  "email": "pedro@example.com"
}
```

**ou:**
```json
{
  "userId": 5
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invitedEmail": "pedro@example.com",
    "inviterName": "joao",
    "status": "PENDING",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

### GET /campaigns/:id/invitations
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `listInvites()`
> Componente: `GerirConvitesModal.tsx`

**Query Params:** `?status=PENDING`

**Status possíveis:** `"PENDING"` | `"ACCEPTED"` | `"REJECTED"` | `"CANCELLED"`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invitedEmail": "pedro@example.com",
      "inviterName": "joao",
      "status": "PENDING",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### POST /invitations/:inviteId/accept
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `acceptInvite()`
> Página: `app/(app)/vaquinhas/privadas/[id]/join/page.tsx`

**Response (200):**
```json
{
  "success": true,
  "message": "Convite aceite"
}
```

### POST /invitations/:inviteId/reject
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `rejectInvite()`
> Página: `app/(app)/vaquinhas/privadas/[id]/join/page.tsx`

**Response (200):**
```json
{
  "success": true,
  "message": "Convite rejeitado"
}
```

---

## 8. CONTRIBUIÇÕES

```
POST /campaigns/:id/contribute
```

### POST /campaigns/:id/contribute
> Ficheiro: `utils/vaquinhasPrivadas.ts` — `contributeToCampaign()`
> Componente: `components/vaquinhas/ContribuicaoForm.tsx`

**Request:**
```json
{
  "amount": 500.00,
  "message": "Boa sorte com a viagem!",
  "anonimo": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vaquinhaId": "1",
    "usuarioId": "uuid",
    "usuario": {
      "id": "uuid",
      "nome": "Melzira Ebo",
      "username": "melzira_ebo"
    },
    "valor": 500.00,
    "mensagem": "Boa sorte com a viagem!",
    "anonimo": false,
    "criadoEm": "2026-03-09T14:32:00Z"
  }
}
```

---

## 9. DASHBOARD

```
GET /dashboard
```

### GET /dashboard
> Página: `app/(app)/dashboard/page.tsx`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "nome": "Melzira",
      "saldo": 12500.00,
      "saldoPendente": 800.00
    },
    "transacoesRecentes": [
      {
        "id": "1",
        "tipo": "contribuicao",
        "nome": "Viagem para Portugal",
        "valor": -500,
        "data": "2026-03-09T14:32:00Z"
      }
    ],
    "vaquinhas": [
      {
        "id": "1",
        "nome": "Viagem para Portugal",
        "tipo": "privada",
        "progresso": 64,
        "meta": 5000,
        "arrecadado": 3200
      }
    ],
    "contributionGraph": [
      { "date": "2026-03-01", "count": 3 },
      { "date": "2026-03-02", "count": 0 }
    ]
  }
}
```

---

## 10. BUSCA GLOBAL

```
GET /search
```

### GET /search
> Componente: `components/dashboard/global-search.tsx`

**Query Params:** `?q=viagem`

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "1", "label": "Viagem para Portugal", "type": "vaquinha", "href": "/vaquinhas/1" },
    { "id": "2", "label": "joao_viagem", "type": "user", "href": "/perfil/2" }
  ]
}
```

---

## 11. WEBSOCKET — Notificações em Tempo Real

```
WS /ws
```

> Hook: `hooks/websocket/useWebSocket.ts`
> Componente: `components/realtime/RealTimeNotification.tsx`

### Eventos recebidos (Server → Client)
```json
{
  "tipo": "nova_contribuicao",
  "vaquinhaId": "1",
  "contribuicao": {
    "id": "uuid",
    "vaquinhaId": "1",
    "usuarioId": "uuid",
    "usuario": { "id": "uuid", "nome": "João", "username": "joao" },
    "valor": 200,
    "mensagem": "Força!",
    "anonimo": false,
    "criadoEm": "2026-03-09T14:32:00Z"
  },
  "mensagem": "João contribuiu 200 VAKS para Viagem para Portugal",
  "timestamp": "2026-03-09T14:32:00Z"
}
```

**Tipos de notificação:** `"nova_contribuicao"` | `"meta_atingida"` | `"transferencia_recebida"`

---

## Resumo de Todas as Rotas

| #  | Método   | Endpoint                                      | Descrição                        |
|----|----------|-----------------------------------------------|----------------------------------|
| 1  | `POST`   | `/auth/register`                              | Registar utilizador              |
| 2  | `POST`   | `/auth/login`                                 | Login                            |
| 3  | `GET`    | `/auth/me`                                    | Dados do utilizador logado       |
| 4  | `GET`    | `/users/:id`                                  | Obter perfil                     |
| 5  | `PUT`    | `/users/:id`                                  | Atualizar perfil                 |
| 6  | `GET`    | `/users/:id/settings`                         | Obter configurações              |
| 7  | `PUT`    | `/users/:id/settings`                         | Guardar configurações            |
| 8  | `GET`    | `/wallet`                                     | Obter carteira + transações      |
| 9  | `POST`   | `/wallet/transfer`                            | Transferir VAKS                  |
| 10 | `GET`    | `/campaigns`                                  | Listar campanhas                 |
| 11 | `GET`    | `/campaigns/:id`                              | Detalhe de campanha              |
| 12 | `POST`   | `/campaigns`                                  | Criar campanha                   |
| 13 | `PUT`    | `/campaigns/:id`                              | Atualizar campanha               |
| 14 | `DELETE` | `/campaigns/:id`                              | Encerrar campanha                |
| 15 | `GET`    | `/campaigns/:id/members`                      | Listar membros                   |
| 16 | `POST`   | `/campaigns/:id/members/:userId/promote`      | Promover membro a SUDO           |
| 17 | `DELETE` | `/campaigns/:id/members/:userId`              | Remover membro                   |
| 18 | `POST`   | `/campaigns/:id/invite`                       | Enviar convite                   |
| 19 | `GET`    | `/campaigns/:id/invitations`                  | Listar convites                  |
| 20 | `POST`   | `/invitations/:inviteId/accept`               | Aceitar convite                  |
| 21 | `POST`   | `/invitations/:inviteId/reject`               | Rejeitar convite                 |
| 22 | `POST`   | `/campaigns/:id/contribute`                   | Contribuir para campanha         |
| 23 | `GET`    | `/dashboard`                                  | Dados do dashboard               |
| 24 | `GET`    | `/search?q=...`                               | Busca global                     |
| 25 | `WS`     | `/ws`                                         | WebSocket (notificações)         |
