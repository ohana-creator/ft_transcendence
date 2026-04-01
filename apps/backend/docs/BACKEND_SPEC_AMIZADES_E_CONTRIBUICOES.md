# Especificacao Backend - Amizades e Contribuicoes (Perfil)

## Objetivo
Este documento define o que o backend deve expor para:
1. Reativar contador e modal de amigos com dados reais.
2. Alimentar o grafico de contribuicoes do perfil com dados reais (anual e mensal).
3. Suportar estado de amizade no perfil publico de outro utilizador.

## Escopo
- Modulo social (amizades, pedidos, bloqueios, estado entre dois users).
- Modulo de contribuicoes para heatmap (perfil).
- Contratos HTTP (request/response), regras de negocio, erros e criterios de aceitacao.

## Principios
1. Todas as rotas devem exigir autenticacao (Bearer token), exceto quando explicitamente indicado.
2. Todas as respostas devem manter formato consistente.
3. Datas em ISO-8601 UTC no payload bruto.
4. Agregacoes por dia devem respeitar timezone de produto (recomendado: Africa/Luanda).

## Formato padrao de resposta
Sucesso:

```json
{
  "success": true,
  "data": {}
}
```

Erro:

```json
{
  "success": false,
  "message": "Mensagem amigavel",
  "errors": {
    "campo": ["detalhe opcional"]
  }
}
```

---

## 1) Dominio Social (Amizades)

### 1.1 Modelo de dados sugerido

#### friend_requests
- id (uuid)
- from_user_id (uuid)
- to_user_id (uuid)
- status (enum): PENDING | ACCEPTED | DECLINED | CANCELED
- created_at (timestamp)
- responded_at (timestamp nullable)

Indices:
- (to_user_id, status)
- (from_user_id, status)
- indice unico parcial para requests pendentes por par

#### friendships
- id (uuid)
- user_a_id (uuid)
- user_b_id (uuid)
- created_at (timestamp)

Regra:
- salvar par ordenado (min(user_id), max(user_id))
- unique(user_a_id, user_b_id)

#### blocks
- id (uuid)
- blocker_user_id (uuid)
- blocked_user_id (uuid)
- created_at (timestamp)

Unique:
- unique(blocker_user_id, blocked_user_id)

### 1.2 Regras de negocio
1. Nao permitir pedido para si mesmo.
2. Nao permitir pedido duplicado pendente no mesmo par.
3. Nao permitir pedido se houver bloqueio entre os users.
4. Aceitar pedido deve:
- validar ownership do destinatario;
- alterar request para ACCEPTED;
- criar amizade se ainda nao existir.
5. Remover amizade deve apagar o vinculo nos dois sentidos (modelo de par unico).
6. Bloquear user deve:
- remover amizade ativa (se existir);
- cancelar requests pendentes entre o par;
- impedir novo pedido enquanto bloqueado.

### 1.3 Endpoints obrigatorios

#### GET /friends
Lista amigos do utilizador logado.

Response 200:

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "2d4a...",
        "username": "pmiguel",
        "nome": "Pedro Miguel",
        "avatarUrl": null,
        "friendsSince": "2026-03-21T10:20:00Z"
      }
    ],
    "meta": {
      "total": 1
    }
  }
}
```

#### GET /friend-requests?direction=incoming|outgoing&status=PENDING
Lista pedidos enviados ou recebidos.

Response 200 (incoming):

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
          "nome": "Joana Silva",
          "avatarUrl": null
        },
        "toUser": {
          "id": "b1",
          "username": "pmiguel",
          "nome": "Pedro Miguel",
          "avatarUrl": null
        },
        "status": "PENDING",
        "createdAt": "2026-03-28T12:00:00Z"
      }
    ],
    "meta": {
      "total": 1
    }
  }
}
```

#### POST /friend-requests
Cria pedido de amizade.

Request:

```json
{
  "targetUserId": "b1"
}
```

Alternativa valida:

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
    "createdAt": "2026-03-28T12:00:00Z"
  }
}
```

Erros:
- 400 pedido invalido
- 404 user nao encontrado
- 409 pedido ja pendente
- 422 bloqueio ativo

#### PATCH /friend-requests/:id/accept
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
      "createdAt": "2026-03-29T09:30:00Z"
    }
  }
}
```

#### PATCH /friend-requests/:id/decline
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

#### DELETE /friend-requests/:id
Cancela pedido enviado.

Response 204 (sem body) ou 200 com success.

#### DELETE /friends/:userId
Remove amizade existente.

Response 204.

#### POST /blocks/:userId
Bloqueia utilizador.

Response 201:

```json
{
  "success": true,
  "data": {
    "blockedUserId": "b1",
    "createdAt": "2026-03-29T10:00:00Z"
  }
}
```

#### DELETE /blocks/:userId
Desbloqueia utilizador.

Response 204.

#### GET /friendship-status/:username
Estado da relacao entre utilizador logado e username alvo.

Response 200:

```json
{
  "success": true,
  "data": {
    "status": "friends"
  }
}
```

Valores aceites:
- friends
- outgoing
- incoming
- blocked
- can-send

### 1.4 Endpoint de resumo social (recomendado)
#### GET /users/me/stats

Response 200:

```json
{
  "success": true,
  "data": {
    "friendsCount": 12,
    "campaignsCount": 4,
    "contributionsCount": 534,
    "saldoVaks": 12450
  }
}
```

Uso no frontend:
- pill de topo no perfil (saldo, vaquinhas, contribuicoes, amigos).

---

## 2) Contribuicoes (Grafico Heatmap do Perfil)

### 2.1 Objetivo funcional
O card de Contribuicoes precisa de:
1. Total do periodo selecionado.
2. Serie diaria para pintar os quadrados por nivel.
3. Suporte para:
- visao anual (year)
- visao mensal (month)

### 2.2 Fonte de verdade
Contar contribuicoes reais feitas pelo user em campanhas.
Pode vir de:
- tabela contributions
ou
- transacoes wallet com tipo CAMPAIGN_CONTRIBUTION (status COMPLETED)

### 2.3 Endpoint principal
#### GET /users/me/contributions/heatmap?year=2026&month=3
- month e opcional.
- sem month: retorna ano inteiro.
- com month: retorna apenas mes.

Response 200:

```json
{
  "success": true,
  "data": {
    "timezone": "Africa/Luanda",
    "year": 2026,
    "month": 3,
    "totalContributions": 534,
    "days": [
      { "date": "2026-03-01", "count": 3 },
      { "date": "2026-03-02", "count": 0 },
      { "date": "2026-03-03", "count": 7 }
    ]
  }
}
```

Observacao:
- O frontend calcula level (0..4) a partir de count, portanto o backend so precisa enviar count diario.
- Opcionalmente, backend pode enviar level pronto para manter consistencia cross-client.

### 2.4 Endpoint opcional para anos disponiveis
#### GET /users/me/contributions/years

Response 200:

```json
{
  "success": true,
  "data": {
    "years": [2026, 2025, 2024]
  }
}
```

### 2.5 Regras de agregacao
1. Filtrar apenas contribuicoes confirmadas.
2. Agrupar por dia local (timezone de negocio).
3. Retornar dias sem contribuicao com count 0 para simplificar render.
4. Ordenar por data asc.

### 2.6 Performance minima
- indice por (user_id, created_at)
- indice por (user_id, status, created_at) se transacional
- limite de periodo para evitar scans longos

---

## 3) Mapeamento rapido para frontend atual

### Perfil principal
- contador amigos: GET /users/me/stats ou GET /friends
- modal amigos:
  - tab amigos: GET /friends
  - tab enviados: GET /friend-requests?direction=outgoing&status=PENDING
  - tab pendentes: GET /friend-requests?direction=incoming&status=PENDING
  - aceitar: PATCH /friend-requests/:id/accept
  - recusar/cancelar: PATCH /friend-requests/:id/decline ou DELETE /friend-requests/:id
  - remover: DELETE /friends/:userId
  - bloquear: POST /blocks/:userId

### Perfil publico de outro user
- estado do botao: GET /friendship-status/:username
- adicionar amigo: POST /friend-requests

### Card de contribuicoes
- dados do heatmap: GET /users/me/contributions/heatmap?year=YYYY&month=MM

---

## 4) Erros esperados (padrao)

### 401
Token ausente/invalido.

### 403
Operacao nao permitida (ex.: aceitar pedido que nao foi recebido pelo user logado).

### 404
Recurso nao encontrado (user/pedido/amizade).

### 409
Conflito de estado (pedido duplicado, amizade ja existe).

### 422
Regra de negocio (bloqueio ativo, auto amizade).

---

## 5) Criterios de aceitacao backend
1. Todos os endpoints acima respondem com contrato estavel.
2. Fluxo completo de amizade funciona:
- enviar pedido
- aceitar
- remover
- bloquear
3. friendship-status retorna valores esperados para todos cenarios.
4. heatmap retorna total e serie diaria coerentes com contribuicoes reais.
5. Dados de stats batem com listas detalhadas.
6. Sem rotas 404 nos fluxos usados pelo frontend de perfil.

---

## 6) Checklist de entrega
1. Migracoes criadas e aplicadas (friend_requests, friendships, blocks).
2. Endpoints protegidos com auth.
3. Testes de integracao cobrindo fluxos principais.
4. Documentacao OpenAPI atualizada com exemplos.
5. Validacao em staging com um user real (ex.: pmiguel) para busca/amizades.
