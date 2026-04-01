# API de Carteira Digital (Wallet) — Documentação Completa

> **Base URL** (via API Gateway): `http://localhost:3000`
>
> Todas as rotas exigem autenticação **JWT** (`Authorization: Bearer <token>`).  
> O token é obtido no Auth Service (`POST /auth/login`).
>
> Rotas internas utilizam **API Key** (`X-Internal-API-Key`) para comunicação serviço-a-serviço.

---

## Índice

- [Modelos de Dados](#modelos-de-dados)
- [Rotas Públicas (Autenticadas)](#rotas-públicas-autenticadas)
  - [Obter Carteira do Utilizador](#1-obter-carteira-do-utilizador)
  - [Obter Saldo](#2-obter-saldo)
  - [Transferir VAKS](#3-transferir-vaks)
  - [Histórico de Transações](#4-histórico-de-transações)
  - [Detalhes da Transação](#5-detalhes-da-transação)
- [Rotas Internas (Serviço-a-Serviço)](#rotas-internas-serviço-a-serviço)
  - [Contribuição a Campanha](#6-contribuição-a-campanha)
  - [Reembolso de Contribuição](#7-reembolso-de-contribuição)
  - [Depósito Interno](#8-depósito-interno)
- [Enumerações](#enumerações)
- [Exemplos de Resposta](#exemplos-de-resposta)
- [Erros Comuns](#erros-comuns)

---

## Modelos de Dados

### Wallet (Carteira)

| Campo         | Tipo              | Descrição                                                    |
| ------------- | ----------------- | ------------------------------------------------------------ |
| `id`          | `string (UUID)`   | Identificador único da carteira                              |
| `userId`      | `string (UUID)`   | ID do utilizador proprietário (null para carteiras de campanha) |
| `campaignId`  | `string (UUID)`   | ID da campanha associada (null para carteiras de utilizador) |
| `balance`     | `decimal`         | Saldo atual da carteira (máx. 18 dígitos, 2 casas decimais) |
| `createdAt`   | `DateTime`        | Data de criação da carteira                                  |
| `updatedAt`   | `DateTime`        | Data da última atualização                                   |

### Transaction (Transação)

| Campo        | Tipo                | Descrição                                                  |
| ------------ | ------------------- | ---------------------------------------------------------- |
| `id`         | `string (UUID)`     | Identificador único da transação                           |
| `fromWalletId` | `string (UUID)`   | ID da carteira de origem (null para depósitos iniciais)    |
| `toWalletId` | `string (UUID)`     | ID da carteira de destino                                  |
| `amount`     | `decimal`           | Montante transferido (2 casas decimais)                    |
| `type`       | `TransactionType`   | Tipo de transação: `P2P_TRANSFER`, `CAMPAIGN_CONTRIBUTION`, `CAMPAIGN_WITHDRAWAL`, `DEPOSIT` |
| `status`     | `TransactionStatus` | Estado: `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`       |
| `metadata`   | `JSON`              | Dados adicionais (ex.: ID da campanha, notas)              |
| `createdAt`  | `DateTime`          | Data de criação                                            |
| `updatedAt`  | `DateTime`          | Data da última atualização                                 |

---

## Rotas Públicas (Autenticadas)

### 1. Obter Carteira do Utilizador

```
GET /wallet
```

Obtém informações completas da carteira do utilizador autenticado.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT (`Bearer <token>`) |

#### Response 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "campaignId": null,
  "balance": "1250.75",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 401 | `Unauthorized` | Token JWT inválido ou expirado |
| 404 | `Not Found` | Carteira não encontrada para o utilizador |
| 500 | `Internal Server Error` | Erro ao processar requisição |

---
deve ficar
### 2. Obter Saldo

```
GET /wallet/balance
```

Obtém apenas o saldo atual da carteira do utilizador autenticado.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Response 200 OK

```json
{
  "balance": "1250.75",
  "currency": "VAKS"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 401 | `Unauthorized` | Token JWT inválido |
| 404 | `Not Found` | Carteira não encontrada |

---

### 3. Transferir VAKS

```
POST /wallet/transfer
```

Transfere VAKS de um utilizador para outro (P2P Transfer). O saldo é debitado imediatamente da carteira do remetente.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |
| `Content-Type` | `string` | `application/json` |

#### Body (JSON)

| Campo | Tipo | Obrigatório | Validação | Descrição |
| ----- | ---- | ----------- | --------- | --------- |
| `toUserId` | `string (UUID)` | ✅ Sim | UUID válido | ID do utilizador destinatário |
| `amount` | `number` | ✅ Sim | Mín. 0.01, máx. 1.000.000 | Montante a transferir (máx. 2 casas decimais) |
| `note` | `string` | ❌ Não | Máx. 500 caracteres | Nota/descrição da transferência |

#### Exemplo de Request

```json
{
  "toUserId": "987e6543-e89b-12d3-a456-426614174999",
  "amount": 50.25,
  "note": "Pagamento de empréstimo"
}
```

#### Response 201 Created

```json
{
  "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
  "fromWalletId": "550e8400-e29b-41d4-a716-446655440000",
  "toWalletId": "660e8400-e29b-41d4-a716-446655440111",
  "amount": "50.25",
  "type": "P2P_TRANSFER",
  "status": "COMPLETED",
  "metadata": {
    "note": "Pagamento de empréstimo",
    "toUsername": "joao_silva"
  },
  "createdAt": "2025-03-28T12:03:21Z",
  "updatedAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Dados inválidos (UUID inválido, montante negativo, etc.) |
| 401 | `Unauthorized` | Token JWT inválido |
| 404 | `Not Found` | Carteira do remetente ou destinatário não encontrada |
| 409 | `Conflict` | Saldo insuficiente para a transferência |
| 422 | `Unprocessable Entity` | Montante inválido (ex.: maior que 1.000.000) |

---

### 4. Histórico de Transações

```
GET /wallet/transactions
```

Obtém o histórico de transações paginado do utilizador autenticado.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Query Parameters (Opcional)

| Parâmetro | Tipo | Default | Validação | Descrição |
| --------- | ---- | ------- | --------- | --------- |
| `page` | `number` | 1 | Mín. 1 | Número da página |
| `limit` | `number` | 20 | Mín. 1, máx. 50 | Quantidade de registos por página |
| `type` | `string` | — | Enum (ver abaixo) | Filtrar por tipo de transação |

**Valores válidos para `type`:**
- `P2P_TRANSFER` — Transferência entre utilizadores
- `CAMPAIGN_CONTRIBUTION` — Contribuição para campanha
- `CAMPAIGN_WITHDRAWAL` — Saque de campanha
- `DEPOSIT` — Depósito inicial

#### Exemplo de Request

```
GET /wallet/transactions?page=1&limit=20&type=P2P_TRANSFER
```

#### Response 200 OK

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
      "fromWalletId": "550e8400-e29b-41d4-a716-446655440000",
      "toWalletId": "660e8400-e29b-41d4-a716-446655440111",
      "amount": "50.25",
      "type": "P2P_TRANSFER",
      "status": "COMPLETED",
      "metadata": {
        "note": "Pagamento de empréstimo",
        "toUsername": "joao_silva"
      },
      "createdAt": "2025-03-28T12:03:21Z",
      "updatedAt": "2025-03-28T12:03:21Z"
    },
    {
      "id": "b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7",
      "fromWalletId": null,
      "toWalletId": "550e8400-e29b-41d4-a716-446655440000",
      "amount": "100.00",
      "type": "DEPOSIT",
      "status": "COMPLETED",
      "metadata": {
        "note": "Depósito inicial"
      },
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Parâmetros de paginação ou filtro inválidos |
| 401 | `Unauthorized` | Token JWT inválido |
| 404 | `Not Found` | Carteira não encontrada |

---

### 5. Detalhes da Transação

```
GET /wallet/transactions/:id
```

Obtém detalhes completos de uma transação específica.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Path Parameters (Obrigatório)

| Parâmetro | Tipo | Descrição |
| --------- | ---- | --------- |
| `id` | `string (UUID)` | ID da transação |

#### Exemplo de Request

```
GET /wallet/transactions/a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6
```

#### Response 200 OK

```json
{
  "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
  "fromWalletId": "550e8400-e29b-41d4-a716-446655440000",
  "toWalletId": "660e8400-e29b-41d4-a716-446655440111",
  "amount": "50.25",
  "type": "P2P_TRANSFER",
  "status": "COMPLETED",
  "metadata": {
    "note": "Pagamento de empréstimo",
    "toUsername": "joao_silva",
    "fromUsername": "maria_santos"
  },
  "createdAt": "2025-03-28T12:03:21Z",
  "updatedAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | UUID inválido |
| 401 | `Unauthorized` | Token JWT inválido |
| 403 | `Forbidden` | Utilizador não autorizado a ver esta transação |
| 404 | `Not Found` | Transação não encontrada |

---

## Rotas Internas (Serviço-a-Serviço)

> ⚠️ **Nota:** Estas rotas são **apenas para comunicação interna** entre serviços (Campaign Service → Wallet Service, Ledger Service → Wallet Service).
> Utilizam autenticação via **API Key** e **não devem ser expostas** ao cliente/frontend.

### 6. Contribuição a Campanha

```
POST /wallet/campaign/contribute
```

Registra uma contribuição de um utilizador para uma campanha. Chamada internamente pelo **Campaign Service** durante o fluxo Saga.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `X-Internal-API-Key` | `string` | API Key de serviço-a-serviço |
| `Content-Type` | `string` | `application/json` |

#### Body (JSON)

| Campo | Tipo | Obrigatório | Validação | Descrição |
| ----- | ---- | ----------- | --------- | --------- |
| `userId` | `string (UUID)` | ✅ Sim | UUID válido | ID do utilizador que contribui |
| `campaignId` | `string (UUID)` | ✅ Sim | UUID válido | ID da campanha |
| `amount` | `number` | ✅ Sim | Mín. 0.01, máx. 1.000.000 | Montante a contribuir |
| `campaignTitle` | `string` | ❌ Não | Máx. 200 caracteres | Título da campanha (para metadata) |

#### Exemplo de Request

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "campaignId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100.00,
  "campaignTitle": "Ajuda para a escola"
}
```

#### Response 201 Created

```json
{
  "id": "c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8",
  "fromWalletId": "550e8400-e29b-41d4-a716-446655440000",
  "toWalletId": "770e8400-e29b-41d4-a716-446655440222",
  "amount": "100.00",
  "type": "CAMPAIGN_CONTRIBUTION",
  "status": "COMPLETED",
  "metadata": {
    "campaignId": "550e8400-e29b-41d4-a716-446655440000",
    "campaignTitle": "Ajuda para a escola",
    "contributorUsername": "maria_santos"
  },
  "createdAt": "2025-03-28T12:03:21Z",
  "updatedAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Dados inválidos |
| 401 | `Unauthorized` | API Key inválida ou ausente |
| 404 | `Not Found` | Carteira do utilizador ou campanha não encontrada |
| 409 | `Conflict` | Saldo insuficiente |

---

### 7. Reembolso de Contribuição

```
POST /wallet/campaign/refund
```

Reembolsa uma contribuição de campanha. Chamada internamente durante compensação Saga (ex.: quando a campanha é cancelada).

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `X-Internal-API-Key` | `string` | API Key de serviço-a-serviço |
| `Content-Type` | `string` | `application/json` |

#### Body (JSON)

| Campo | Tipo | Obrigatório | Validação | Descrição |
| ----- | ---- | ----------- | --------- | --------- |
| `userId` | `string (UUID)` | ✅ Sim | UUID válido | ID do utilizador a reembolsar |
| `campaignId` | `string (UUID)` | ✅ Sim | UUID válido | ID da campanha |
| `amount` | `number` | ✅ Sim | Mín. 0.01, máx. 1.000.000 | Montante a reembolsar |
| `campaignTitle` | `string` | ❌ Não | Máx. 200 caracteres | Título da campanha (para metadata) |

#### Exemplo de Request

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "campaignId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100.00,
  "campaignTitle": "Ajuda para a escola"
}
```

#### Response 201 Created

```json
{
  "id": "d4e5f6a7-b8c9-50d1-e2f3-a4b5c6d7e8f9",
  "fromWalletId": "770e8400-e29b-41d4-a716-446655440222",
  "toWalletId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "100.00",
  "type": "CAMPAIGN_WITHDRAWAL",
  "status": "COMPLETED",
  "metadata": {
    "campaignId": "550e8400-e29b-41d4-a716-446655440000",
    "campaignTitle": "Ajuda para a escola",
    "reason": "Reembolso automático",
    "recipientUsername": "maria_santos"
  },
  "createdAt": "2025-03-28T12:03:21Z",
  "updatedAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Dados inválidos |
| 401 | `Unauthorized` | API Key inválida |
| 404 | `Not Found` | Carteira não encontrada |

---

### 8. Depósito Interno

```
POST /wallet/deposit
```

Realiza um depósito (transfer in) na carteira de um utilizador. Chamada pelo **Ledger Service** quando uma transação blockchain é confirmada.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `X-Internal-API-Key` | `string` | API Key de serviço-a-serviço |
| `Content-Type` | `string` | `application/json` |

#### Body (JSON)

| Campo | Tipo | Obrigatório | Validação | Descrição |
| ----- | ---- | ----------- | --------- | --------- |
| `userId` | `string (UUID)` | ✅ Sim | UUID válido | ID do utilizador a depositar |
| `amount` | `number` | ✅ Sim | Mín. 0.01, máx. 1.000.000 | Montante a depositar |
| `note` | `string` | ❌ Não | Máx. 500 caracteres | Nota do depósito |

#### Exemplo de Request

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 250.50,
  "note": "Depósito de blockchainConfirmed TxHash: 0x1234567890abcdef"
}
```

#### Response 201 Created

```json
{
  "id": "e5f6a7b8-c9d0-51e2-f3a4-b5c6d7e8f9a0",
  "fromWalletId": null,
  "toWalletId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "250.50",
  "type": "DEPOSIT",
  "status": "COMPLETED",
  "metadata": {
    "note": "Depósito de blockchain confirmado TxHash: 0x1234567890abcdef",
    "source": "ledger-service"
  },
  "createdAt": "2025-03-28T12:03:21Z",
  "updatedAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Dados inválidos (montante negativo, etc.) |
| 401 | `Unauthorized` | API Key inválida |
| 404 | `Not Found` | Utilizador ou carteira não encontrada |
| 422 | `Unprocessable Entity` | Montante fora do intervalo permitido |

---

## Enumerações

### TransactionType (Tipo de Transação)

| Valor | Descrição |
| ----- | --------- |
| `P2P_TRANSFER` | Transferência direta entre dois utilizadores (peer-to-peer) |
| `CAMPAIGN_CONTRIBUTION` | Contribuição para uma campanha (vaquinha) |
| `CAMPAIGN_WITHDRAWAL` | Saque de fundos de campanha (reembolso ou fechamento) |
| `DEPOSIT` | Depósito inicial ou transfer in na carteira |

### TransactionStatus (Estado da Transação)

| Valor | Descrição |
| ----- | --------- |
| `PENDING` | Transação aguardando processamento (temporário) |
| `COMPLETED` | Transação completada com sucesso |
| `FAILED` | Transação falhou (ex.: saldo insuficiente) |
| `REVERSED` | Transação foi revertida (compensação Saga) |

---

## Exemplos de Resposta

### Estrutura Básica de Erro

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "amount",
      "constraint": "isPositive",
      "message": "amount must be a positive number"
    }
  ]
}
```

### Resposta de Erro de Autenticação

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid JWT token"
}
```

### Resposta de Saldo Insuficiente

```json
{
  "statusCode": 409,
  "message": "Insufficient balance",
  "error": "Conflict",
  "details": {
    "required": 100.00,
    "available": 45.50
  }
}
```

---

## Erros Comuns

### 400 — Bad Request
**Causas:**
- UUID inválido no `toUserId` ou `campaignId`
- Montante negativo ou zero
- Montante com mais de 2 casas decimais
- Montante superior a 1.000.000
- Campos obrigatórios ausentes
- Tipo de transação inválido no filtro

**Solução:**
- Valide o formato dos UUIDs
- Certifique-se de que o montante está entre 0.01 e 1.000.000
- Verifique se todos os campos obrigatórios foram enviados

### 401 — Unauthorized
**Causas:**
- Token JWT ausente ou inválido
- Token JWT expirado
- API Key ausente (rotas internas)
- API Key incorreta

**Solução:**
- Obtenha um novo token via `POST /auth/login`
- Verifique se o token JWT está no header `Authorization: Bearer <token>`
- Valide a API Key no header `X-Internal-API-Key`

### 404 — Not Found
**Causas:**
- Carteira do utilizador não existe
- Transação com ID especificado não encontrada
- Utilizador destinatário não existe

**Solução:**
- Verifique se o utilizador/transação existe
- Garanta que o UUID está correto

### 409 — Conflict
**Causas:**
- Saldo insuficiente para a transferência
- Transação duplicada

**Solução:**
- Verifique o saldo disponível antes de fazer a transferência
- Reduza o montante da transferência

### 422 — Unprocessable Entity
**Causas:**
- Montante inválido ou fora do intervalo permitido
- Dados de validação não cumprem as regras de negócio

**Solução:**
- Certifique-se de que o montante está entre 0.01 e 1.000.000
- Verifique se a campanha está ativa (para contribuições)

### 500 — Internal Server Error
**Causas:**
- Erro inesperado no servidor
- Falha de conexão à base de dados
- Erro na processamento de transação Saga

**Solução:**
- Contacte o suporte
- Verifique os logs do servidor
- Tente novamente após alguns segundos

---

## Notas de Implementação

### Transações Saga
As operações que envolvem múltiplos serviços (ex.: contribuição a campanha) utilizam o padrão **Saga Orquestrado**:

1. **Campaign Service** inicia a saga
2. **Wallet Service** debita a carteira do utilizador
3. Se houver erro, a compensação reverte a transação (status `REVERSED`)

### Segurança
- Todas as transações financeiras são **immutáveis** (apenas leitura pós-criação)
- Depósitos e transferências são **atômicas** (tudo ou nada)
- Saldos são armazenados com **2 casas decimais** máximas

### Performance
- As transações são indexadas por `createdAt` e `type` para queries rápidas
- Paginação recomendada: máx. 50 itens por página
- Cache de saldos atualizado em tempo real

---

**Versão da Documentação:** 1.0  
**Última Atualização:** 28 de Março de 2025  
**Status:** ✅ Pronto para Produção
