# User Service - Social e Contributions API

## Base URL
- Via API Gateway: `http://localhost:3000`
- Direto no serviço: `http://localhost:3004`

## Autenticacao
- Todas as rotas deste documento exigem `Authorization: Bearer <token>`.

## Formato de resposta
Sucesso:

```json
{
  "success": true,
  "data": {}
}
```

Erro (padrao NestJS no estado atual):

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

## 1) Friends

### GET /friends
Lista os amigos do utilizador autenticado.

Response 200:

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "2d4a...",
        "username": "pmiguel",
        "nome": "pmiguel",
        "avatarUrl": null,
        "friendsSince": "2026-03-21T10:20:00.000Z"
      }
    ],
    "meta": {
      "total": 1
    }
  }
}
```

### DELETE /friends/:userId
Remove amizade com o user indicado.

Response 204: sem body.

Erros comuns:
- 404 amizade nao encontrada

---

## 2) Friend Requests

### GET /friend-requests?direction=incoming|outgoing&status=PENDING|ACCEPTED|DECLINED|CANCELED
Lista pedidos recebidos/enviados.

Defaults:
- `direction=incoming`
- `status=PENDING`

Response 200:

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "8f0b...",
        "fromUser": {
          "id": "a1",
          "username": "joana",
          "nome": "joana",
          "avatarUrl": null
        },
        "toUser": {
          "id": "b1",
          "username": "pmiguel",
          "nome": "pmiguel",
          "avatarUrl": null
        },
        "status": "PENDING",
        "createdAt": "2026-03-28T12:00:00.000Z"
      }
    ],
    "meta": {
      "total": 1
    }
  }
}
```

### POST /friend-requests
Cria pedido de amizade.

Request (opcao 1):

```json
{
  "targetUserId": "b1f4bfb9-7f91-4863-a6f6-5a8028d91c6a"
}
```

Request (opcao 2):

```json
{
  "targetUsername": "pmiguel"
}
```

Response 201:

```json
{
  "success": true,
  "data": {
    "id": "8f0b...",
    "status": "PENDING",
    "createdAt": "2026-03-28T12:00:00.000Z"
  }
}
```

Erros comuns:
- 400 target ausente
- 404 user alvo nao encontrado
- 409 amizade ja existe / request pendente
- 422 auto-request / bloqueio ativo

### PATCH /friend-requests/:id/accept
Aceita pedido recebido.

Response 200:

```json
{
  "success": true,
  "data": {
    "requestId": "8f0b...",
    "status": "ACCEPTED",
    "friendship": {
      "id": "f77c...",
      "createdAt": "2026-03-29T09:30:00.000Z"
    }
  }
}
```

Erros comuns:
- 403 pedido nao pertence ao user autenticado
- 404 pedido nao encontrado
- 409 pedido nao esta pendente

### PATCH /friend-requests/:id/decline
Recusa pedido recebido.

Response 200:

```json
{
  "success": true,
  "data": {
    "requestId": "8f0b...",
    "status": "DECLINED"
  }
}
```

Erros comuns:
- 403 pedido nao pertence ao user autenticado
- 404 pedido nao encontrado
- 409 pedido nao esta pendente

### DELETE /friend-requests/:id
Cancela pedido enviado.

Response 204: sem body.

Erros comuns:
- 403 pedido nao pertence ao user autenticado
- 404 pedido nao encontrado
- 409 pedido nao esta pendente

---

## 3) Blocks

### POST /blocks/:userId
Bloqueia user alvo.

Efeitos colaterais:
- remove amizade ativa entre o par
- cancela pedidos pendentes entre o par

Response 201:

```json
{
  "success": true,
  "data": {
    "blockedUserId": "b1",
    "createdAt": "2026-03-29T10:00:00.000Z"
  }
}
```

Erros comuns:
- 404 user alvo nao encontrado
- 422 nao pode bloquear a si mesmo

### DELETE /blocks/:userId
Desbloqueia user alvo.

Response 204: sem body.

---

## 4) Friendship Status

### GET /friendship-status/:username
Retorna estado da relacao entre user autenticado e username alvo.

Response 200:

```json
{
  "success": true,
  "data": {
    "status": "friends"
  }
}
```

Valores de `status`:
- `friends`
- `outgoing`
- `incoming`
- `blocked`
- `can-send`

Erro comum:
- 404 user alvo nao encontrado

---

## 5) Profile Stats

### GET /users/me/stats
Resumo para card/pills do perfil.

Response 200:

```json
{
  "success": true,
  "data": {
    "friendsCount": 12,
    "campaignsCount": 0,
    "contributionsCount": 534,
    "saldoVaks": 12450
  }
}
```

Notas:
- `friendsCount` vem do user-service.
- `contributionsCount` e `saldoVaks` sao agregados via wallet-service.
- `campaignsCount` esta atualmente retornado como `0`.

---

## 6) Contributions Heatmap

### GET /users/me/contributions/heatmap?year=2026&month=3
- `year` obrigatorio
- `month` opcional (1..12)

Response 200:

```json
{
  "success": true,
  "data": {
    "timezone": "Africa/Luanda",
    "year": 2026,
    "month": 3,
    "userId": "c11e...",
    "totalContributions": 534,
    "days": [
      { "date": "2026-03-01", "count": 3 },
      { "date": "2026-03-02", "count": 0 },
      { "date": "2026-03-03", "count": 7 }
    ]
  }
}
```

Regras atuais:
- considera apenas transacoes `CAMPAIGN_CONTRIBUTION` com `status=COMPLETED`
- agrega por dia em timezone `Africa/Luanda`
- inclui dias sem contribuicao com `count: 0`

### GET /users/me/contributions/years
Lista anos com contribuicoes do user.

Response 200:

```json
{
  "success": true,
  "data": {
    "years": [2026, 2025, 2024]
  }
}
```

---

## 7) Mapeamento rapido no frontend
- Contador de amigos: `GET /users/me/stats` ou `GET /friends`
- Modal amigos:
  - amigos: `GET /friends`
  - enviados: `GET /friend-requests?direction=outgoing&status=PENDING`
  - pendentes: `GET /friend-requests?direction=incoming&status=PENDING`
  - aceitar: `PATCH /friend-requests/:id/accept`
  - recusar: `PATCH /friend-requests/:id/decline`
  - cancelar: `DELETE /friend-requests/:id`
  - remover amizade: `DELETE /friends/:userId`
  - bloquear: `POST /blocks/:userId`
- Perfil publico:
  - estado do botao: `GET /friendship-status/:username`
  - adicionar amigo: `POST /friend-requests`
- Heatmap:
  - `GET /users/me/contributions/heatmap?year=YYYY&month=MM`
