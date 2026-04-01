# Estratégia de Caching Frontend + Backend

## Objetivo
Melhorar performance e fluidez das telas carregando UI skeleton primeiro, depois dados em background + cache.

---

## Camada Backend: Cache Headers HTTP

### Endpoints com Cache Permitido
Os endpoints de **GET** devem retornar headers `Cache-Control` para permitir cache no navegador:

```
Cache-Control: public, max-age=300
```

**Implementação no Campaign Service** (exemplo):
```ts
// Backend/campaign-service/src/campaigns/campaigns.controller.ts

@Get()
async findAll(
  @Query() dto: ListCampaignsDto,
  @CurrentUser() user: { userId: string },
  @Res() res: FastifyReply,
) {
  const result = await this.campaignsService.findAll(dto, user.userId);
  
  // Cache no navegador por 5 minutos (300s)
  res.header('Cache-Control', 'public, max-age=300');
  res.header('ETag', `"${hashData(result)}"`);
  
  return result;
}
```

**Endpoints com caching recomendado:**
- `GET /campaigns` → `max-age=300` (5 min)
- `GET /campaigns/:id` → `max-age=600` (10 min)
- `GET /users/search` → `max-age=300` (5 min)
- `GET /users/:id` → `max-age=600` (10 min)
- `GET /uploads/*` → `max-age=31536000` (1 ano, imagens são imutáveis)

**Endpoints SEM cache (sempre frescos):**
- `POST`, `PUT`, `DELETE` → sem cache
- `GET /wallet/*` → `max-age=0, must-revalidate` (sempre fresh)
- `GET /friends/*` → `max-age=60` (1 min, dados sensíveis)

---

## Camada Frontend: Estratégia com SWR ou React Query

### 1. Setup Inicial (escolher uma opção)

#### Opção A: SWR (mais simples)
```bash
npm install swr
```

#### Opção B: React Query (mais robusta)
```bash
npm install @tanstack/react-query
```

### 2. Padrão de Carregamento: Skeleton → Dados → Cache

#### Exemplo com SWR
```tsx
import useSWR from 'swr';

export function CampaignsList() {
  const { data, error, isLoading } = useSWR(
    '/campaigns?page=1&limit=10',
    fetcher,
    {
      // Estratégia: mostrar dados stale enquanto revalidam
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minuto sem duplicar requisições
      focusThrottleInterval: 300000, // Revalidar a cada 5 min se tabela voltar em foco
    }
  );

  // Mostrar skeleton enquanto carrega
  if (isLoading) return <CampaignsSkeleton />;
  if (error) return <div>Erro ao carregar campanhas</div>;

  return (
    <div>
      {data?.campaigns.map(c => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );
}
```

#### Exemplo com React Query
```tsx
import { useQuery } from '@tanstack/react-query';

export function CampaignsList() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['campaigns', 1],
    queryFn: () => fetcher('/campaigns?page=1&limit=10'),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // Cache por 10 min
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <CampaignsSkeleton />;
  if (error) return <div>Erro ao carregar campanhas</div>;

  return (
    <div>
      {data?.campaigns.map(c => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );
}
```

### 3. Skeleton Screens (UI Vazia Rápida)

Criar componentes de "esqueleto" que carregam antes dos dados:

```tsx
export function CampaignsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-32 bg-gray-300 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded shadow animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-300 rounded w-1/2" />
    </div>
  );
}
```

### 4. LocalStorage para Dados Críticos

Guardar dados do user e carteira em localStorage para acesso instantâneo:

```ts
// hooks/useLocalCache.ts
export function useLocalCache<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => {
    // 1. Tenta carregar do localStorage (instantâneo)
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  });

  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 2. Fetch em background
    setIsLoading(true);
    fetcher()
      .then(fresh => {
        setData(fresh);
        localStorage.setItem(key, JSON.stringify(fresh)); // 3. Atualiza localStorage
        setIsLoading(false);
      })
      .catch(e => {
        setError(e);
        setIsLoading(false);
      });
  }, []);

  return { data, isLoading, error };
}
```

Uso:
```tsx
function UserProfile() {
  const { data: user, isLoading } = useLocalCache('user', () =>
    fetch('/users/me').then(r => r.json())
  );

  if (!user) return <UserSkeleton />; // Skeleton enquanto carrega
  if (isLoading) return <>{user.name}</>;
  return <div>{user.name}</div>;
}
```

### 5. Invalidação de Cache (quando dados mudam)

```tsx
import { useQueryClient } from '@tanstack/react-query';

function CreateCampaignForm() {
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    await fetch('/campaigns', { method: 'POST', body: JSON.stringify(data) });
    
    // Invalidar cache de campanhas para refetch automático
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Checklist de Implementação

### Backend
- [ ] Adicionar headers `Cache-Control` em endpoints GET
- [ ] Implementar ETag ou Last-Modified para validação condicional
- [ ] Testar Cache-Control com `curl -I` ou DevTools

### Frontend
- [ ] Instalar SWR ou React Query
- [ ] Criar componentes Skeleton para cada tela
- [ ] Implementar useLocalCache para dados críticos (user, carteira)
- [ ] Configurar staleTime e gcTime apropriados
- [ ] Invalidar cache quando dados são alterados (create, update, delete)

### Monitoramento
- [ ] Verificar Network tab (DevTools) → "cached" vs "from network"
- [ ] Confirmar que Skeleton aparece antes dos dados
- [ ] Testar performance com Network Throttling (DevTools → 3G lento)

---

## Estratégia por Tela

### Vaquinhas (Campanhas)
```
1. Mostrar lista com Skeleton
2. Fetch GET /campaigns (cache 5 min)
3. Componente SWR com staleWhileRevalidate
4. Ao criar/editar, invalidar ['campaigns']
```

### Perfil do User
```
1. Mostrar foto + nome do localStorage (instantâneo)
2. Fetch GET /users/me (cache 10 min)
3. Localizado em componente top-level (Navbar)
4. Atualizar localStorage ao sair da aba
```

### Carteira
```
1. Mostrar saldo anterior (localStorage)
2. Fetch GET /wallet/balance (cache 1 min)
3. Ao fazer topup, refetch com stale: true
4. Nunca usar cache longo (dados ficam desincronizados)
```

### Busca (Search)
```
1. Mostrar resultados anteriores se existirem
2. Fetch GET /users/search?q=... (cache 2 min por query)
3. Debounce de 300ms antes de requisição
4. Limpar cache quando usuário limpar input
```

---

## Exemplo Completo: Página de Campanhas

```tsx
import useSWR from 'swr';
import { CampaignsSkeleton, CampaignCard } from '@/components';

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  
  const { data, error, isLoading } = useSWR(
    `/campaigns?page=${page}&limit=10`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return (
    <div>
      {/* Header (rápido) */}
      <h1>Campanhas Ativas</h1>

      {/* Skeleton enquanto carrega */}
      {isLoading && <CampaignsSkeleton />}

      {/* Dados já carregados */}
      {data && (
        <div className="grid gap-4">
          {data.campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {/* Erro */}
      {error && <div className="text-red-500">Erro ao carregar</div>}

      {/* Pagination */}
      <div className="mt-4 flex gap-2">
        {Array.from({ length: data?.meta.pages || 1 }).map((_, i) => (
          <button
            key={i + 1}
            onClick={() => setPage(i + 1)}
            className={page === i + 1 ? 'bg-blue-500' : 'bg-gray-300'}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Performance Esperado

Com essa estratégia:
- **Tempo até interação**: <200ms (skeleton)
- **Tempo até dados visíveis**: <1s (cache local + fetch)
- **Tempo reload (com cache HTTP)**: <300ms
- **Redução de requisições**: ~60% (dedupingInterval + staleWhileRevalidate)

---

## Referências
- SWR Docs: https://swr.vercel.app
- React Query Docs: https://tanstack.com/query
- HTTP Caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
