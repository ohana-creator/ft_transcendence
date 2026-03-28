# API de Vaquinhas (Campanhas) — Documentação Completa

> **Base URL** (via API Gateway): `http://localhost:3000`
>
> Todas as rotas exigem autenticação **JWT** (`Authorization: Bearer <token>`).  
> O token é obtido no Auth Service (`POST /auth/login`).

---

## Índice

- [Modelos de Dados](#modelos-de-dados)
- [Rotas de Campanhas](#rotas-de-campanhas)
  - [Criar Campanha](#1-criar-campanha)
  - [Listar Campanhas](#2-listar-campanhas)
  - [Detalhes de uma Campanha](#3-detalhes-de-uma-campanha)
  - [Atualizar Campanha](#4-atualizar-campanha)
  - [Fechar Campanha](#5-fechar-campanha)
  - [Contribuir para uma Campanha](#6-contribuir-para-uma-campanha)
- [Rotas de Membros](#rotas-de-membros)
  - [Listar Membros](#7-listar-membros)
  - [Promover Membro a SUDO](#8-promover-membro-a-sudo)
  - [Remover Membro](#9-remover-membro)
- [Rotas de Convites](#rotas-de-convites)
  - [Enviar Convite](#10-enviar-convite)
  - [Listar Convites Pendentes](#11-listar-convites-pendentes)
  - [Aceitar Convite](#12-aceitar-convite)
  - [Rejeitar Convite](#13-rejeitar-convite)
- [Enumerações](#enumerações)
- [Erros Comuns](#erros-comuns)

---

## Modelos de Dados

### Campaign (Campanha / Vaquinha)

| Campo           | Tipo              | Descrição                                                    |
| --------------- | ----------------- | ------------------------------------------------------------ |
| `id`            | `string (UUID)`   | Identificador único da campanha                              |
| `title`         | `string`          | Título da campanha (5–100 caracteres)                        |
| `description`   | `string`          | Descrição detalhada (20–5000 caracteres)                     |
| `isPrivate`     | `boolean`         | `true` = privada (só membros veem); `false` = pública        |
| `goalAmount`    | `decimal \| null` | Valor objetivo a arrecadar (ex.: `100.00`). Pode ser nulo    |
| `goalVisible`   | `boolean`         | Se `true`, o objetivo é visível para todos os membros        |
| `currentAmount` | `decimal`         | Valor já arrecadado (começa em `0.00`)                       |
| `deadline`      | `DateTime \| null`| Data limite da campanha (ISO 8601). Pode ser nula            |
| `ownerId`       | `string (UUID)`   | ID do utilizador criador (dono)                              |
| `ownerUsername` | `string`          | Username do criador (sincronizado automaticamente)           |
| `status`        | `CampaignStatus`  | Estado atual: `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED` |
| `createdAt`     | `DateTime`        | Data de criação                                              |
| `updatedAt`     | `DateTime`        | Data da última atualização                                   |
| `closedAt`      | `DateTime \| null`| Data em que foi fechada/cancelada                            |

### CampaignMember (Membro)

| Campo        | Tipo           | Descrição                                    |
| ------------ | -------------- | -------------------------------------------- |
| `id`         | `string (UUID)`| Identificador único do registo de membro     |
| `campaignId` | `string (UUID)`| ID da campanha                               |
| `userId`     | `string (UUID)`| ID do utilizador membro                      |
| `username`   | `string`       | Username do membro (sincronizado)            |
| `role`       | `MemberRole`   | Papel: `SUDO` (admin) ou `VAKER` (membro)    |
| `joinedAt`   | `DateTime`     | Data em que entrou na campanha               |

### Invitation (Convite)

| Campo           | Tipo              | Descrição                                              |
| --------------- | ----------------- | ------------------------------------------------------ |
| `id`            | `string (UUID)`   | Identificador único do convite                         |
| `campaignId`    | `string (UUID)`   | ID da campanha a que pertence                          |
| `invitedUserId` | `string \| null`  | ID do utilizador convidado (quando conhecido)          |
| `invitedEmail`  | `string \| null`  | Email do convidado (alternativa ao userId)             |
| `inviterId`     | `string (UUID)`   | ID de quem fez o convite                               |
| `inviterName`   | `string`          | Username de quem fez o convite                         |
| `status`        | `InviteStatus`    | Estado: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` |
| `createdAt`     | `DateTime`        | Data de criação do convite                             |
| `respondedAt`   | `DateTime \| null`| Data em que o convidado respondeu                      |

---

## Rotas de Campanhas

### 1. Criar Campanha

```
POST /campaigns
```

Cria uma nova campanha. O utilizador autenticado torna-se automaticamente o **dono** e recebe o papel `SUDO`.

#### Body (JSON)

| Campo         | Tipo      | Obrigatório | Validação                    | Descrição                                     |
| ------------- | --------- | ----------- | ---------------------------- | --------------------------------------------- |
| `title`       | `string`  | ✅ Sim       | Mín. 5, máx. 100 caracteres  | Título da campanha                            |
| `description` | `string`  | ✅ Sim       | Mín. 20, máx. 5000 caracteres| Descrição detalhada da campanha               |
| `isPrivate`   | `boolean` | ❌ Não       | —                            | Campanha privada? Default: `false`            |
| `goalAmount`  | `number`  | ❌ Não       | Mín. `0.01`                  | Valor objetivo a arrecadar (ex.: `500.00`)    |
| `goalVisible` | `boolean` | ❌ Não       | —                            | Mostrar objetivo? Default: `true`             |
| `deadline`    | `string`  | ❌ Não       | Formato ISO 8601             | Data limite (ex.: `"2025-12-31T23:59:59Z"`)   |

#### Exemplo de Request

```json
{
  "title": "Presente de Aniversário da Sofia",
  "description": "Vamos juntar dinheiro para comprar um presente especial para a Sofia no seu 30º aniversário.",
  "isPrivate": true,
  "goalAmount": 150.00,
  "goalVisible": true,
  "deadline": "2025-06-30T23:59:59Z"
}
```

#### Exemplo de Resposta (201 Created)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Presente de Aniversário da Sofia",
  "description": "Vamos juntar dinheiro para comprar um presente especial para a Sofia no seu 30º aniversário.",
  "isPrivate": true,
  "goalAmount": "150.00",
  "goalVisible": true,
  "currentAmount": "0.00",
  "deadline": "2025-06-30T23:59:59.000Z",
  "ownerId": "user-uuid-here",
  "ownerUsername": "joao123",
  "status": "ACTIVE",
  "createdAt": "2025-03-25T10:00:00.000Z",
  "updatedAt": "2025-03-25T10:00:00.000Z",
  "closedAt": null,
  "members": [
    {
      "id": "member-uuid",
      "campaignId": "a1b2c3d4-...",
      "userId": "user-uuid-here",
      "username": "joao123",
      "role": "SUDO",
      "joinedAt": "2025-03-25T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Listar Campanhas

```
GET /campaigns
```

Retorna campanhas **públicas** e campanhas **privadas** onde o utilizador autenticado é membro. O resultado é paginado.

#### Query Parameters

| Parâmetro | Tipo     | Obrigatório | Valores possíveis                          | Default         | Descrição                                   |
| --------- | -------- | ----------- | ------------------------------------------ | --------------- | ------------------------------------------- |
| `search`  | `string` | ❌ Não       | Qualquer texto                             | —               | Pesquisa por título ou descrição            |
| `status`  | `string` | ❌ Não       | `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED` | —           | Filtrar por estado                          |
| `sortBy`  | `string` | ❌ Não       | `createdAt`, `currentAmount`               | `createdAt`     | Ordenação (sempre descendente)              |
| `page`    | `number` | ❌ Não       | Inteiro ≥ 1                                | `1`             | Número da página                            |
| `limit`   | `number` | ❌ Não       | Inteiro entre 1 e 50                       | `10`            | Resultados por página                       |

#### Exemplo de Request

```
GET /campaigns?status=ACTIVE&search=aniversário&sortBy=createdAt&page=1&limit=5
```

#### Exemplo de Resposta (200 OK)

```json
{
  "campaigns": [
    {
      "id": "a1b2c3d4-...",
      "title": "Presente de Aniversário da Sofia",
      "description": "Vamos juntar dinheiro...",
      "isPrivate": false,
      "goalAmount": "150.00",
      "goalVisible": true,
      "currentAmount": "75.00",
      "deadline": "2025-06-30T23:59:59.000Z",
      "ownerId": "user-uuid",
      "ownerUsername": "joao123",
      "status": "ACTIVE",
      "createdAt": "2025-03-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 5,
    "pages": 1
  }
}
```

---

### 3. Detalhes de uma Campanha

```
GET /campaigns/:id
```

Retorna todos os detalhes de uma campanha. Campanhas privadas só são acessíveis a membros.

#### Path Parameters

| Parâmetro | Tipo     | Descrição          |
| --------- | -------- | ------------------ |
| `id`      | `string` | UUID da campanha   |

#### Exemplo de Resposta (200 OK)

```json
{
  "id": "a1b2c3d4-...",
  "title": "Presente de Aniversário da Sofia",
  "description": "Vamos juntar dinheiro para comprar um presente especial...",
  "isPrivate": true,
  "goalAmount": "150.00",
  "goalVisible": true,
  "currentAmount": "75.00",
  "deadline": "2025-06-30T23:59:59.000Z",
  "ownerId": "user-uuid",
  "ownerUsername": "joao123",
  "status": "ACTIVE",
  "createdAt": "2025-03-25T10:00:00.000Z",
  "updatedAt": "2025-03-25T12:00:00.000Z",
  "closedAt": null,
  "_count": {
    "members": 5
  }
}
```

> **Nota:** Campanhas privadas retornam `403 Forbidden` se o utilizador não for membro.

---

### 4. Atualizar Campanha

```
PUT /campaigns/:id
```

Atualiza os dados de uma campanha. Apenas o **dono** ou membros com papel `SUDO` podem editar.

#### Path Parameters

| Parâmetro | Tipo     | Descrição        |
| --------- | -------- | ---------------- |
| `id`      | `string` | UUID da campanha |

#### Body (JSON) — todos os campos são opcionais

| Campo         | Tipo      | Validação                     | Descrição                               |
| ------------- | --------- | ----------------------------- | --------------------------------------- |
| `title`       | `string`  | Mín. 5, máx. 100 caracteres   | Novo título da campanha                 |
| `description` | `string`  | Mín. 20, máx. 5000 caracteres | Nova descrição                          |
| `isPrivate`   | `boolean` | —                             | Alterar visibilidade                    |
| `goalAmount`  | `number`  | Mín. `0.01`                   | Novo objetivo de valor                  |
| `goalVisible` | `boolean` | —                             | Mostrar/ocultar objetivo                |
| `deadline`    | `string`  | Formato ISO 8601              | Nova data limite                        |

#### Exemplo de Request

```json
{
  "title": "Presente Especial da Sofia — 30 Anos",
  "goalAmount": 200.00
}
```

#### Exemplo de Resposta (200 OK)

```json
{
  "id": "a1b2c3d4-...",
  "title": "Presente Especial da Sofia — 30 Anos",
  "goalAmount": "200.00",
  "status": "ACTIVE",
  "updatedAt": "2025-03-25T14:00:00.000Z"
}
```

---

### 5. Fechar Campanha

```
DELETE /campaigns/:id
```

Cancela/fecha uma campanha. Apenas o **dono** pode executar esta ação. O estado passa para `CANCELLED`.

#### Path Parameters

| Parâmetro | Tipo     | Descrição        |
| --------- | -------- | ---------------- |
| `id`      | `string` | UUID da campanha |

#### Exemplo de Resposta (200 OK)

```json
{
  "id": "a1b2c3d4-...",
  "title": "Presente Especial da Sofia — 30 Anos",
  "status": "CANCELLED",
  "closedAt": "2025-03-25T15:00:00.000Z"
}
```

---

### 6. Contribuir para uma Campanha

```
POST /campaigns/:id/contribute
```

Debita fundos da carteira (`wallet`) do utilizador e adiciona ao valor atual da campanha.

- Campanhas **privadas**: só membros podem contribuir.
- A campanha deve estar com estado `ACTIVE`.
- Se o `currentAmount` atingir o `goalAmount`, a campanha passa automaticamente para `COMPLETED`.
- Se o débito na carteira for bem-sucedido mas a atualização da campanha falhar, um **reembolso automático** é acionado (saga compensation).

#### Path Parameters

| Parâmetro | Tipo     | Descrição        |
| --------- | -------- | ---------------- |
| `id`      | `string` | UUID da campanha |

#### Body (JSON)

| Campo     | Tipo     | Obrigatório | Validação       | Descrição                                      |
| --------- | -------- | ----------- | --------------- | ---------------------------------------------- |
| `amount`  | `number` | ✅ Sim       | Mín. `0.01`     | Valor a contribuir (ex.: `25.00`)              |
| `message` | `string` | ❌ Não       | Máx. 200 caracteres | Mensagem opcional a acompanhar a contribuição |

#### Exemplo de Request

```json
{
  "amount": 25.00,
  "message": "Boa sorte Sofia! 🎉"
}
```

#### Exemplo de Resposta (201 Created)

```json
{
  "success": true,
  "currentAmount": "100.00"
}
```

---

## Rotas de Membros

### 7. Listar Membros

```
GET /campaigns/:id/members
```

Lista os membros de uma campanha com paginação. Campanhas privadas só são acessíveis a membros.

#### Path Parameters

| Parâmetro | Tipo     | Descrição        |
| --------- | -------- | ---------------- |
| `id`      | `string` | UUID da campanha |

#### Query Parameters

| Parâmetro | Tipo     | Default | Descrição              |
| --------- | -------- | ------- | ---------------------- |
| `page`    | `number` | `1`     | Número da página       |
| `limit`   | `number` | `10`    | Resultados por página  |

#### Exemplo de Resposta (200 OK)

```json
{
  "members": [
    {
      "id": "member-uuid",
      "campaignId": "a1b2c3d4-...",
      "userId": "user-uuid",
      "username": "joao123",
      "role": "SUDO",
      "joinedAt": "2025-03-25T10:00:00.000Z"
    },
    {
      "id": "member-uuid-2",
      "campaignId": "a1b2c3d4-...",
      "userId": "user-uuid-2",
      "username": "maria456",
      "role": "VAKER",
      "joinedAt": "2025-03-25T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

---

### 8. Promover Membro a SUDO

```
POST /campaigns/:id/members/:userId/promote
```

Promove um membro com papel `VAKER` para `SUDO`. Apenas o **dono** ou membros `SUDO` podem promover.

#### Path Parameters

| Parâmetro | Tipo     | Descrição                     |
| --------- | -------- | ----------------------------- |
| `id`      | `string` | UUID da campanha              |
| `userId`  | `string` | UUID do membro a ser promovido|

#### Exemplo de Resposta (201 Created)

```json
{
  "id": "member-uuid-2",
  "campaignId": "a1b2c3d4-...",
  "userId": "user-uuid-2",
  "username": "maria456",
  "role": "SUDO",
  "joinedAt": "2025-03-25T11:00:00.000Z"
}
```

---

### 9. Remover Membro

```
DELETE /campaigns/:id/members/:userId
```

Remove um membro da campanha. Apenas o **dono** ou membros `SUDO` podem remover. O dono **não pode** ser removido.

#### Path Parameters

| Parâmetro | Tipo     | Descrição                     |
| --------- | -------- | ----------------------------- |
| `id`      | `string` | UUID da campanha              |
| `userId`  | `string` | UUID do membro a ser removido |

#### Exemplo de Resposta (200 OK)

```json
{
  "id": "member-uuid-2",
  "campaignId": "a1b2c3d4-...",
  "userId": "user-uuid-2",
  "username": "maria456",
  "role": "VAKER",
  "joinedAt": "2025-03-25T11:00:00.000Z"
}
```

---

## Rotas de Convites

### 10. Enviar Convite

```
POST /campaigns/:id/invite
```

Envia um convite para um utilizador se juntar a uma campanha (pública ou privada). Apenas o **dono** ou membros `SUDO` podem convidar. Deve fornecer `userId` ou `email` (pelo menos um).

#### Path Parameters

| Parâmetro | Tipo     | Descrição        |
| --------- | -------- | ---------------- |
| `id`      | `string` | UUID da campanha |

#### Body (JSON)

| Campo    | Tipo     | Obrigatório              | Validação       | Descrição                          |
| -------- | -------- | ------------------------ | --------------- | ---------------------------------- |
| `userId` | `string` | ❌ (um dos dois é exigido)| UUID válido     | ID do utilizador a convidar        |
| `email`  | `string` | ❌ (um dos dois é exigido)| Email válido    | Email do utilizador a convidar     |

> **Nota:** Deve ser fornecido pelo menos `userId` ou `email`. Ambos podem ser enviados simultaneamente.

#### Exemplo de Request (por userId)

```json
{
  "userId": "target-user-uuid"
}
```

#### Exemplo de Request (por email)

```json
{
  "email": "sofia@example.com"
}
```

#### Exemplo de Resposta (201 Created)

```json
{
  "id": "invitation-uuid",
  "campaignId": "a1b2c3d4-...",
  "invitedUserId": "target-user-uuid",
  "invitedEmail": null,
  "inviterId": "user-uuid",
  "inviterName": "joao123",
  "status": "PENDING",
  "createdAt": "2025-03-25T12:00:00.000Z",
  "respondedAt": null
}
```

---

### 11. Listar Convites Pendentes

```
GET /campaigns/:id/invitations
```

Lista todos os convites de uma campanha. Apenas membros ou o dono da campanha podem ver esta lista.

#### Path Parameters

| Parâmetro | Tipo     | Descrição        |
| --------- | -------- | ---------------- |
| `id`      | `string` | UUID da campanha |

#### Exemplo de Resposta (200 OK)

```json
[
  {
    "id": "invitation-uuid",
    "campaignId": "a1b2c3d4-...",
    "invitedUserId": "target-user-uuid",
    "invitedEmail": null,
    "inviterId": "user-uuid",
    "inviterName": "joao123",
    "status": "PENDING",
    "createdAt": "2025-03-25T12:00:00.000Z",
    "respondedAt": null
  }
]
```

---

### 12. Aceitar Convite

```
POST /invitations/:id/accept
```

Aceita um convite pendente. O utilizador autenticado torna-se membro da campanha com papel `VAKER`. Apenas o utilizador convidado pode aceitar.

#### Path Parameters

| Parâmetro | Tipo     | Descrição         |
| --------- | -------- | ----------------- |
| `id`      | `string` | UUID do convite   |

#### Exemplo de Resposta (201 Created)

```json
{
  "id": "invitation-uuid",
  "campaignId": "a1b2c3d4-...",
  "invitedUserId": "target-user-uuid",
  "status": "ACCEPTED",
  "respondedAt": "2025-03-25T13:00:00.000Z"
}
```

---

### 13. Rejeitar Convite

```
POST /invitations/:id/reject
```

Rejeita um convite pendente. Apenas o utilizador convidado pode rejeitar.

#### Path Parameters

| Parâmetro | Tipo     | Descrição         |
| --------- | -------- | ----------------- |
| `id`      | `string` | UUID do convite   |

#### Exemplo de Resposta (201 Created)

```json
{
  "id": "invitation-uuid",
  "campaignId": "a1b2c3d4-...",
  "invitedUserId": "target-user-uuid",
  "status": "REJECTED",
  "respondedAt": "2025-03-25T13:05:00.000Z"
}
```

---

## Enumerações

### CampaignStatus

| Valor       | Descrição                                                          |
| ----------- | ------------------------------------------------------------------ |
| `ACTIVE`    | Campanha ativa e a aceitar contribuições                           |
| `COMPLETED` | Objetivo atingido — campanha concluída automaticamente            |
| `CANCELLED` | Campanha cancelada pelo dono (via `DELETE /campaigns/:id`)         |
| `EXPIRED`   | Campanha expirada (deadline ultrapassada, processada por job)     |

### MemberRole

| Valor   | Permissões                                                                         |
| ------- | ---------------------------------------------------------------------------------- |
| `SUDO`  | Pode editar campanha, convidar utilizadores, promover e remover membros            |
| `VAKER` | Pode ver detalhes e contribuir; sem permissões administrativas                     |

> **Nota:** O dono da campanha (`ownerId`) tem todas as permissões de `SUDO` acrescidas da capacidade exclusiva de fechar/cancelar a campanha e não pode ser removido.

### InviteStatus

| Valor      | Descrição                              |
| ---------- | -------------------------------------- |
| `PENDING`  | Convite enviado, aguarda resposta      |
| `ACCEPTED` | Convite aceite — utilizador é membro  |
| `REJECTED` | Convite rejeitado pelo utilizador      |
| `CANCELLED`| Convite cancelado (reservado)          |

---

## Erros Comuns

| Código HTTP | Situação                                                                  |
| ----------- | ------------------------------------------------------------------------- |
| `400 Bad Request`   | Dados inválidos no body / campanha não está ativa / convite já respondido |
| `401 Unauthorized`  | Token JWT em falta ou inválido                                            |
| `403 Forbidden`     | Sem permissão (campanha privada, papel insuficiente, etc.)               |
| `404 Not Found`     | Campanha, membro ou convite não encontrado                               |
| `409 Conflict`      | Utilizador já é membro / convite pendente já existe                       |

### Exemplo de Resposta de Erro

```json
{
  "statusCode": 403,
  "message": "Only SUDO or owner can invite",
  "error": "Forbidden"
}
```

---

## Resumo de Todas as Rotas

| Método   | Rota                                       | Descrição                              | Permissão mínima        |
| -------- | ------------------------------------------ | -------------------------------------- | ----------------------- |
| `POST`   | `/campaigns`                               | Criar campanha                         | Utilizador autenticado  |
| `GET`    | `/campaigns`                               | Listar campanhas (paginado, filtros)   | Utilizador autenticado  |
| `GET`    | `/campaigns/:id`                           | Detalhes de uma campanha               | Membro (se privada)     |
| `PUT`    | `/campaigns/:id`                           | Atualizar campanha                     | SUDO ou dono            |
| `DELETE` | `/campaigns/:id`                           | Fechar/cancelar campanha               | Apenas dono             |
| `POST`   | `/campaigns/:id/contribute`                | Contribuir para campanha               | Membro (se privada)     |
| `GET`    | `/campaigns/:id/members`                   | Listar membros                         | Membro (se privada)     |
| `POST`   | `/campaigns/:id/members/:userId/promote`   | Promover membro a SUDO                 | SUDO ou dono            |
| `DELETE` | `/campaigns/:id/members/:userId`           | Remover membro                         | SUDO ou dono            |
| `POST`   | `/campaigns/:id/invite`                    | Enviar convite                         | SUDO ou dono            |
| `GET`    | `/campaigns/:id/invitations`               | Listar convites da campanha            | Qualquer membro         |
| `POST`   | `/invitations/:id/accept`                  | Aceitar convite                        | Utilizador convidado    |
| `POST`   | `/invitations/:id/reject`                  | Rejeitar convite                       | Utilizador convidado    |
