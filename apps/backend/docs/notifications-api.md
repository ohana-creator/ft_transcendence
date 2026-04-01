# API de Notificações — Documentação Completa

> **Base URL** (via API Gateway): `http://localhost:3000`
>
> Todas as rotas exigem autenticação **JWT** (`Authorization: Bearer <token>`).  
> O token é obtido no Auth Service (`POST /auth/login`).
>
> As notificações em tempo real são entregues via **WebSocket** (Socket.io) para melhor experiência do utilizador.

---

## Índice

- [Modelos de Dados](#modelos-de-dados)
- [Rotas REST](#rotas-rest)
  - [Informações de Conexão WebSocket](#1-informações-de-conexão-websocket)
  - [Listar Notificações](#2-listar-notificações)
  - [Listar Notificações Não Lidas](#3-listar-notificações-não-lidas)
  - [Marcar Notificação como Lida](#4-marcar-notificação-como-lida)
  - [Marcar Todas as Notificações como Lidas](#5-marcar-todas-as-notificações-como-lidas)
  - [Eliminar Notificação](#6-eliminar-notificação)
- [WebSocket (Socket.io)](#websocket-socketio)
  - [Conectar ao Namespace de Notificações](#conexão-websocket)
  - [Evento de Notificação em Tempo Real](#evento-notification)
- [Enumerações](#enumerações)
- [Exemplos de Resposta](#exemplos-de-resposta)
- [Erros Comuns](#erros-comuns)

---

## Modelos de Dados

### Notification (Notificação)

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| `id` | `string (UUID)` | Identificador único da notificação |
| `userId` | `string (UUID)` | ID do utilizador destinatário |
| `type` | `NotificationType` | Tipo de notificação (ver enumerações) |
| `title` | `string` | Título da notificação |
| `message` | `string` | Conteúdo/descrição da notificação |
| `metadata` | `JSON` | Dados adicionais (ex.: ID de campanha, ID de transação) |
| `read` | `boolean` | `true` se foi lida, `false` caso contrário |
| `createdAt` | `DateTime` | Data de criação da notificação |

---

## Rotas REST

### 1. Informações de Conexão WebSocket

```
GET /notifications/ws
```

Obtém informações sobre como conectar ao namespace WebSocket para receber notificações em tempo real.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Response 200 OK

```json
{
  "namespace": "/notifications",
  "event": "notification",
  "auth": {
    "method": "JWT Bearer token in handshake",
    "handshakeAuth": "auth.token",
    "handshakeHeader": "Authorization: Bearer <token>"
  },
  "exampleClient": "io('ws://localhost:3003/notifications', { auth: { token: '<JWT>' } })"
}
```

#### Exemplo de Cliente (JavaScript/Socket.io)

```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('authToken'); // JWT obtido no login

const socket = io('ws://localhost:3003/notifications', {
  auth: {
    token: token
  }
});

socket.on('notification', (notification) => {
  console.log('Nova notificação:', notification);
});

socket.on('disconnect', () => {
  console.log('Desconectado do servidor de notificações');
});
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 401 | `Unauthorized` | Token JWT inválido |

---

### 2. Listar Notificações

```
GET /notifications
```

Obtém o histórico de notificações paginado do utilizador autenticado (lidas e não lidas).

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Query Parameters (Opcional)

| Parâmetro | Tipo | Default | Validação | Descrição |
| --------- | ---- | ------- | --------- | --------- |
| `page` | `number` | 1 | Mín. 1 | Número da página |
| `limit` | `number` | 20 | Mín. 1, máx. 100 | Quantidade de notificações por página |

#### Exemplo de Request

```
GET /notifications?page=1&limit=20
```

#### Response 200 OK

```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "type": "CAMPAIGN_CONTRIBUTION",
      "title": "Nova Contribuição",
      "message": "Maria Santos contribuiu com €50.00 para a campanha 'Ajuda para a escola'",
      "metadata": {
        "campaignId": "770e8400-e29b-41d4-a716-446655440222",
        "campaignTitle": "Ajuda para a escola",
        "contributorId": "987e6543-e89b-12d3-a456-426614174999",
        "contributorUsername": "maria_santos",
        "amount": 50.00
      },
      "read": false,
      "createdAt": "2025-03-28T12:03:21Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "type": "WALLET_TRANSFER_RECEIVED",
      "title": "Transferência Recebida",
      "message": "Recebeu €25.50 de João Silva",
      "metadata": {
        "transactionId": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
        "senderId": "654e3210-e89b-12d3-a456-426614174888",
        "senderUsername": "joao_silva",
        "amount": 25.50
      },
      "read": true,
      "createdAt": "2025-03-27T15:30:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Parâmetros de paginação inválidos |
| 401 | `Unauthorized` | Token JWT inválido |

---

### 3. Listar Notificações Não Lidas

```
GET /notifications/unread
```

Obtém apenas as notificações não lidas do utilizador autenticado, paginadas.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Query Parameters (Opcional)

| Parâmetro | Tipo | Default | Validação | Descrição |
| --------- | ---- | ------- | --------- | --------- |
| `page` | `number` | 1 | Mín. 1 | Número da página |
| `limit` | `number` | 20 | Mín. 1, máx. 100 | Quantidade de notificações por página |

#### Exemplo de Request

```
GET /notifications/unread?page=1&limit=10
```

#### Response 200 OK

```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "type": "CAMPAIGN_CONTRIBUTION",
      "title": "Nova Contribuição",
      "message": "Maria Santos contribuiu com €50.00 para a campanha 'Ajuda para a escola'",
      "metadata": {
        "campaignId": "770e8400-e29b-41d4-a716-446655440222",
        "campaignTitle": "Ajuda para a escola",
        "contributorId": "987e6543-e89b-12d3-a456-426614174999",
        "contributorUsername": "maria_santos",
        "amount": 50.00
      },
      "read": false,
      "createdAt": "2025-03-28T12:03:21Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | Parâmetros de paginação inválidos |
| 401 | `Unauthorized` | Token JWT inválido |

---

### 4. Marcar Notificação como Lida

```
PUT /notifications/:id/read
```

Marca uma notificação específica como lida.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Path Parameters (Obrigatório)

| Parâmetro | Tipo | Descrição |
| --------- | ---- | --------- |
| `id` | `string (UUID)` | ID da notificação |

#### Exemplo de Request

```
PUT /notifications/550e8400-e29b-41d4-a716-446655440000/read
```

#### Response 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "CAMPAIGN_CONTRIBUTION",
  "title": "Nova Contribuição",
  "message": "Maria Santos contribuiu com €50.00 para a campanha 'Ajuda para a escola'",
  "metadata": {
    "campaignId": "770e8400-e29b-41d4-a716-446655440222",
    "campaignTitle": "Ajuda para a escola"
  },
  "read": true,
  "createdAt": "2025-03-28T12:03:21Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | UUID inválido |
| 401 | `Unauthorized` | Token JWT inválido |
| 403 | `Forbidden` | Utilizador não autorizado a modificar esta notificação |
| 404 | `Not Found` | Notificação não encontrada |

---

### 5. Marcar Todas as Notificações como Lidas

```
PUT /notifications/read-all
```

Marca todas as notificações não lidas do utilizador autenticado como lidas.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Exemplo de Request

```
PUT /notifications/read-all
```

#### Response 200 OK

```json
{
  "updated": 5
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 401 | `Unauthorized` | Token JWT inválido |

---

### 6. Eliminar Notificação

```
DELETE /notifications/:id
```

Elimina uma notificação específica.

#### Headers (Obrigatório)

| Header | Tipo | Descrição |
| ------ | ---- | --------- |
| `Authorization` | `string` | Bearer token JWT |

#### Path Parameters (Obrigatório)

| Parâmetro | Tipo | Descrição |
| --------- | ---- | --------- |
| `id` | `string (UUID)` | ID da notificação |

#### Exemplo de Request

```
DELETE /notifications/550e8400-e29b-41d4-a716-446655440000
```

#### Response 200 OK

```json
{
  "deleted": true
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
| ------ | ---- | --------- |
| 400 | `Bad Request` | UUID inválido |
| 401 | `Unauthorized` | Token JWT inválido |
| 403 | `Forbidden` | Utilizador não autorizado a eliminar esta notificação |
| 404 | `Not Found` | Notificação não encontrada |

---

## WebSocket (Socket.io)

### Conexão WebSocket

O servidor de notificações utiliza **Socket.io** para enviar notificações em tempo real aos clientes conectados.

#### Endpoint

```
ws://localhost:3003/notifications
wss://api.example.com/notifications (em produção com SSL)
```

#### Autenticação

A autenticação é feita durante o handshake com o token JWT:

```javascript
const socket = io('ws://localhost:3003/notifications', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

#### Exemplo de Implementação (React)

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const socket = io('ws://localhost:3003/notifications', {
      auth: { token }
    });

    socket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('error', (error) => {
      console.error('Erro de notificação:', error);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      <p>Notificações não lidas: {unreadCount}</p>
      {notifications.map(notif => (
        <div key={notif.id}>
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  );
}

export default NotificationCenter;
```

---

### Evento: notification

#### Descrição
Enviado pelo servidor sempre que uma nova notificação é criada para o utilizador conectado.

#### Payload

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "CAMPAIGN_CONTRIBUTION",
  "title": "Nova Contribuição",
  "message": "Maria Santos contribuiu com €50.00 para a campanha 'Ajuda para a escola'",
  "metadata": {
    "campaignId": "770e8400-e29b-41d4-a716-446655440222",
    "campaignTitle": "Ajuda para a escola",
    "contributorId": "987e6543-e89b-12d3-a456-426614174999",
    "contributorUsername": "maria_santos",
    "amount": 50.00
  },
  "read": false,
  "createdAt": "2025-03-28T12:03:21Z"
}
```

#### Exemplo de Listener

```javascript
socket.on('notification', (notification) => {
  console.log('Notificação recebida:', notification.title);
  showToast(notification.message);
});
```

---

## Enumerações

### NotificationType (Tipo de Notificação)

| Valor | Descrição | Exemplo de Metadata |
| ----- | --------- | ------------------- |
| `CAMPAIGN_CONTRIBUTION` | Alguém contribuiu para uma campanha | `{ campaignId, campaignTitle, contributorUsername, amount }` |
| `CAMPAIGN_INVITE` | Convite para participar numa campanha | `{ campaignId, campaignTitle, inviterUsername }` |
| `WALLET_TRANSFER_SENT` | Transferência VAKS enviada para outro utilizador | `{ transactionId, recipientUsername, amount }` |
| `WALLET_TRANSFER_RECEIVED` | Transferência VAKS recebida de outro utilizador | `{ transactionId, senderUsername, amount }` |
| `CAMPAIGN_GOAL_REACHED` | Campanha atingiu o objetivo de arrecadação | `{ campaignId, campaignTitle, goalAmount, currentAmount }` |
| `CAMPAIGN_CLOSED` | Campanha foi fechada/cancelada | `{ campaignId, campaignTitle, reason }` |
| `MEMBER_PROMOTED` | Utilizador foi promovido a SUDO (admin) numa campanha | `{ campaignId, campaignTitle }` |

---

## Exemplos de Resposta

### Estrutura Básica de Erro

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Notificação de Contribuição

```json
{
  "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "CAMPAIGN_CONTRIBUTION",
  "title": "Nova Contribuição para 'Ajuda para a escola'",
  "message": "Maria Santos contribuiu com €50.00",
  "metadata": {
    "campaignId": "770e8400-e29b-41d4-a716-446655440222",
    "campaignTitle": "Ajuda para a escola",
    "contributorId": "987e6543-e89b-12d3-a456-426614174999",
    "contributorUsername": "maria_santos",
    "amount": 50.00
  },
  "read": false,
  "createdAt": "2025-03-28T12:03:21Z"
}
```

### Notificação de Transferência de Carteira

```json
{
  "id": "b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "WALLET_TRANSFER_RECEIVED",
  "title": "Transferência Recebida de João Silva",
  "message": "Recebeu €25.50 de João Silva",
  "metadata": {
    "transactionId": "c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8",
    "senderId": "654e3210-e89b-12d3-a456-426614174888",
    "senderUsername": "joao_silva",
    "amount": 25.50
  },
  "read": false,
  "createdAt": "2025-03-28T12:03:21Z"
}
```

### Notificação de Convite para Campanha

```json
{
  "id": "c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "CAMPAIGN_INVITE",
  "title": "Convite para 'Ajuda para a escola'",
  "message": "João Silva o convidou para participar na campanha 'Ajuda para a escola'",
  "metadata": {
    "campaignId": "770e8400-e29b-41d4-a716-446655440222",
    "campaignTitle": "Ajuda para a escola",
    "inviterId": "654e3210-e89b-12d3-a456-426614174888",
    "inviterUsername": "joao_silva"
  },
  "read": false,
  "createdAt": "2025-03-28T12:03:21Z"
}
```

---

## Erros Comuns

### 400 — Bad Request
**Causas:**
- UUID inválido no ID da notificação
- Parâmetros de paginação inválidos (página ≤ 0, limite > 100)
- Dados malformados

**Solução:**
- Verifique o formato UUID (ex.: `550e8400-e29b-41d4-a716-446655440000`)
- Certifique-se de que `page ≥ 1` e `limit ≤ 100`

### 401 — Unauthorized
**Causas:**
- Token JWT ausente ou inválido
- Token JWT expirado
- Token de um utilizador diferente

**Solução:**
- Obtenha um novo token via `POST /auth/login`
- Verifique se o header `Authorization: Bearer <token>` está correto
- Para WebSocket, verifique se o `auth.token` está correto no handshake

### 403 — Forbidden
**Causas:**
- Tentativa de modificar/eliminar notificação de outro utilizador
- Utilizador não autorizado

**Solução:**
- Apenas o proprietário da notificação pode modificá-la
- Verifique o seu ID de utilizador

### 404 — Not Found
**Causas:**
- Notificação com ID especificado não existe
- Já foi eliminada

**Solução:**
- Verifique se o ID da notificação está correto
- Recarregue a lista de notificações

### 500 — Internal Server Error
**Causas:**
- Erro inesperado no servidor
- Falha de conexão à base de dados
- Erro na entrega em tempo real

**Solução:**
- Contacte o suporte
- Verifique os logs do servidor
- Tente reconectar ao WebSocket

---

## Notas de Implementação

### Melhores Práticas para o Cliente

1. **Carregar Notificações Iniciais:**
   ```javascript
   // Ao entrar na aplicação
   const response = await fetch('/notifications?page=1&limit=20', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   const data = await response.json();
   setNotifications(data.notifications);
   ```

2. **Conectar ao WebSocket:**
   ```javascript
   // Manter a conexão aberta para receber notificações em tempo real
   const socket = io('ws://localhost:3003/notifications', {
     auth: { token }
   });
   ```

3. **Atualizar Notificações Não Lidas:**
   ```javascript
   // Contar notificações não lidas
   const unreadCount = notifications.filter(n => !n.read).length;
   ```

4. **Marcar como Lida ao Visualizar:**
   ```javascript
   // Quando o utilizador clica na notificação
   await fetch(`/notifications/${notificationId}/read`, {
     method: 'PUT',
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

### Otimizações

- **Indicador de Contagem:** Use um badge com o número de notificações não lidas
- **Sons/Vibrações:** Emita som ou vibração ao receber notificação (especialmente em mobile)
- **Persistência:** Guarde o histórico localmente para offline reading
- **Limpeza:** Elimine notificações antigas periodicamente para melhorar performance

---

**Versão da Documentação:** 1.0  
**Última Atualização:** 28 de Março de 2025  
**Status:** ✅ Pronto para Produção
