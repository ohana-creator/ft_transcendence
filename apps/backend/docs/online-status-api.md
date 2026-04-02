# Online Status API — Heartbeat & Real-time Presence

Este documento explica como integrar a funcionalidade de status online (heartbeat) no frontend para rastrear quem está online em tempo real.

---

## 📋 Visão Geral

O sistema de status online funciona com **heartbeats**: cada utilizador autenticado envía periodicamente um "batimento cardíaco" para o backend indicando que está ativo. O backend mantém um timestamp do último heartbeat recebido.

**Um utilizador é considerado "online" se enviou heartbeat nos últimos 60 segundos.**

---

## 🔌 Endpoints

### 1️⃣ POST /users/heartbeat

Envia um heartbeat para indicar que o utilizador está online.

#### Autenticação
- **Obrigatória**: Requer token JWT no header `Authorization: Bearer <token>`
- **Método**: `POST`

#### Request
```bash
curl -X POST http://localhost:3002/users/heartbeat \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid-123",
    "lastSeen": "2026-04-01T20:45:30.123Z"
  }
}
```

#### Códigos de Erro
| Status | Erro | Descrição |
|--------|------|-----------|
| `401` | `Unauthorized` | Token JWT inválido ou ausente |
| `404` | `User not found` | Utilizador não existe no sistema |

---

### 2️⃣ GET /users/online-status

Retorna a lista de utilizadores que estão online (último heartbeat ≤ 60 segundos atrás).

#### Autenticação
- **Opcional**: Endpoint público (sem autenticação obrigatória)
- **Método**: `GET`

#### Query Parameters
| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `limit` | `number` | `100` | Número máximo de utilizadores a retornar |

#### Request
```bash
# Obter top 50 utilizadores online
curl http://localhost:3002/users/online-status?limit=50
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "onlineUsers": [
      {
        "id": "user-uuid-1",
        "username": "joao123",
        "avatarUrl": "https://api.example.com/avatars/joao123.jpg",
        "lastSeen": "2026-04-01T20:45:55.123Z"
      },
      {
        "id": "user-uuid-2",
        "username": "maria456",
        "avatarUrl": "https://api.example.com/avatars/maria456.jpg",
        "lastSeen": "2026-04-01T20:45:40.000Z"
      }
    ],
    "count": 2,
    "timestamp": "2026-04-01T20:45:56.789Z"
  }
}
```

---

## 🔄 Implementação no Frontend

### TypeScript/React

#### 1. Configurar intervalo automático de heartbeat

```typescript
import { useEffect, useRef } from 'react';

const useHeartbeat = (token: string) => {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) return;

    // Enviar heartbeat a cada 30 segundos
    // (margem de segurança: 60s - 30s = 30s buffer)
    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('Heartbeat falhou:', response.status);
        }
      } catch (error) {
        console.error('Erro ao enviar heartbeat:', error);
      }
    };

    // Enviar imediatamente ao montar
    sendHeartbeat();

    // Depois a cada 30 segundos
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30 * 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [token]);
};

export default useHeartbeat;
```

#### 2. Usar hook em componente raiz (App.tsx)

```typescript
import useHeartbeat from './hooks/useHeartbeat';

function App() {
  const token = localStorage.getItem('authToken');

  // Enviar heartbeat enquanto estiver logged in
  useHeartbeat(token || '');

  return (
    <div>
      {/* Resto da app */}
    </div>
  );
}
```

#### 3. Obter lista de utilizadores online

```typescript
import { useEffect, useState } from 'react';

interface OnlineUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  lastSeen: string;
}

const OnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/users/online-status?limit=50');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const { data } = await response.json();
        setOnlineUsers(data.onlineUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar utilizadores online');
      } finally {
        setLoading(false);
      }
    };

    // Carregar imediatamente
    fetchOnlineUsers();

    // Atualizar a cada 10 segundos para reflexo em tempo real
    const interval = setInterval(fetchOnlineUsers, 10 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="online-users">
      <h2>Online Agora ({onlineUsers.length})</h2>
      <ul>
        {onlineUsers.map((user) => (
          <li key={user.id}>
            <img 
              src={user.avatarUrl || '/default-avatar.png'} 
              alt={user.username}
              width={32}
              height={32}
            />
            <span>{user.username}</span>
            <small>{new Date(user.lastSeen).toLocaleTimeString('pt-PT')}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OnlineUsers;
```

#### 4. Exemplo Completo: Sidebar com Status Online

```typescript
import React, { useEffect, useState } from 'react';

interface UserStatus {
  id: string;
  username: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeen: string;
}

const UserSidebar = ({ currentUserId, token }: { currentUserId: string; token: string }) => {
  const [users, setUsers] = useState<UserStatus[]>([]);

  // 1. Enviar heartbeat a cada 30 segundos
  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Heartbeat erro:', error);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  // 2. Obter utilizadores online a cada 5 segundos
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/online-status?limit=100');
        const { data } = await response.json();

        // Mapear para incluir flag de online
        const now = new Date();
        const mappedUsers = data.onlineUsers.map((user: any) => ({
          ...user,
          isOnline: (now.getTime() - new Date(user.lastSeen).getTime()) < 60 * 1000,
        }));

        setUsers(mappedUsers);
      } catch (error) {
        console.error('Erro ao buscar utilizadores:', error);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sidebar">
      <h3>Online ({users.filter(u => u.isOnline).length})</h3>
      <ul className="user-list">
        {users.map((user) => (
          <li key={user.id} className={user.isOnline ? 'online' : 'offline'}>
            <div className="avatar">
              <img src={user.avatarUrl || '/default-avatar.png'} alt={user.username} />
              <span className={`status-dot ${user.isOnline ? 'online' : 'offline'}`} />
            </div>
            <div className="info">
              <p className="username">{user.username}</p>
              <small className="last-seen">
                {user.isOnline ? 'Online agora' : `Visto há ${getTimeAgo(user.lastSeen)}`}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

// Utility: formatar tempo relativo
function getTimeAgo(dateString: string): string {
  const seconds = Math.round((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export default UserSidebar;
```

---

## 📊 Timing Recomendado

| Ação | Intervalo | Justificativa |
|------|-----------|-----------------|
| Heartbeat | **30 segundos** | Margem de segurança (60s limite - 30s intervalo) |
| Fetch online users | **5-10 segundos** | Reflexo em tempo real sem sobrecarregar servidor |
| Atualizar UI | **Imediato** | Mostrar status ao utilizador quando dados chegam |

---

## 🔒 Considerações de Segurança

1. **Heartbeat requer autenticação**: Apenas utilizadores logados podem enviar heartbeat
2. **Online-status é público**: Qualquer um pode ver quem está online
3. **Timeout de 60s**: Garante que dados antigos são descartados
4. **Sem persistência entre sessões**: Heartbeats são perdidos ao restart do servidor

---

## 📱 Desativar Status Online

Se o utilizador fizer logout, pare automaticamente o intervalo de heartbeat:

```typescript
const handleLogout = () => {
  localStorage.removeItem('authToken');
  // Heartbeat hook vai automáticamente parar pois token = null
  redirectTo('/login');
};
```

---

## 🐛 Troubleshooting

### "Heartbeat falhou 401"
- ✅ Verificar se token é válido
- ✅ Verificar se header `Authorization` está correto

### "Utilizador não aparece na lista online"
- ✅ Confirmar que heartbeat foi enviado nos últimos 60 segundos
- ✅ Verificar timestamp no response do heartbeat

### "Utilizador permanece online após logout"
- ✅ Normal até 60 segundos passarem
- ✅ Considerar enviar logout signal opcional para remover imediatamente

---

## 📡 API Gateway (Proxy)

Se a app está atrás de API Gateway, assegurar que:

```yaml
# docker-compose.yml
api-gateway:
  routes:
    - path: /users/heartbeat
      service: user-service
      auth: required
    
    - path: /users/online-status
      service: user-service
      auth: optional
```

---

## 📝 Exemplo Completo com Error Handling

```typescript
interface HeartbeatConfig {
  interval?: number;      // ms entre heartbeats (default 30000)
  timeout?: number;       // ms timeout para request (default 5000)
  onError?: (error: Error) => void;
}

class OnlinePresenceManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private fetchInterval: NodeJS.Timeout | null = null;

  constructor(
    private token: string,
    private config: HeartbeatConfig = {},
  ) {
    this.config.interval = this.config.interval || 30 * 1000;
    this.config.timeout = this.config.timeout || 5 * 1000;
  }

  start() {
    this.sendHeartbeat(); // Imediatamente
    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      this.config.interval
    );
  }

  stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.fetchInterval) clearInterval(this.fetchInterval);
  }

  private async sendHeartbeat() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Heartbeat failed: ${response.status}`);
      }
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getOnlineUsers(limit: number = 100): Promise<Array<any>> {
    try {
      const response = await fetch(`/api/users/online-status?limit=${limit}`);
      if (!response.ok) throw new Error(`Failed to fetch online users: ${response.status}`);
      const { data } = await response.json();
      return data.onlineUsers;
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
}

// Uso
const presence = new OnlinePresenceManager(token, {
  interval: 30 * 1000,
  timeout: 5 * 1000,
  onError: (err) => console.error('Presence error:', err.message),
});

presence.start();

// Limpar ao deslogar
presence.stop();
```

---

## ✅ Checklist de Integração

- [ ] Import/setup do hook de heartbeat na App raiz
- [ ] Heartbeat enviado a cada 30 segundos enquanto logado
- [ ] Componente que exibe lista de utilizadores online
- [ ] Atualizar lista a cada 5-10 segundos
- [ ] Heartbeat para ao fazer logout
- [ ] Error handling configurado
- [ ] Testar com 2+ utilizadores simultâneos
- [ ] Verificar que offline aparece após 60s sem heartbeat

---

**Pronto! Agora a tua app tem status online em tempo real.** 🎉
