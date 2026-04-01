# Cache HTTP & React Query - Implementação Frontend + Backend

## 🎯 Estratégia de Caching

Esta documento descreve como implementar caching HTTP + React Query para melhorar performance da aplicação VAKS.

---

## 1️⃣ Configuração Frontend (✅ CONCLUÍDO)

### React Query Setup
- ✅ `lib/queryClient.ts` - Configuração centralizada
- ✅ `components/providers/QueryClientProvider.tsx` - Provider
- ✅ `app/providers.tsx` - Integrado no root
- ✅ `hooks/use-api-query.ts` - Hook wrapper customizado
- ✅ `components/ui/skeletons.tsx` - Componentes de skeleton
- ✅ `hooks/react-query/useCampaignsQueries.ts` - Hooks para campanhas
- ✅ `hooks/react-query/useWalletQueries.ts` - Hooks para carteira

### Defaults Configurados

```typescript
// staleTime: dados não são "stale" por 5 minutos (padrão)
// gcTime: cache mantido 10 minutos mesmo sem uso
// refetchOnFocus: false (evita requisições extras)
// refetchOnReconnect: true (ao voltar online)
// retry: 2 com exponential backoff
```

### Uso nos Componentes

```tsx
import { useCampaignsList } from '@/hooks/react-query';
import { CampaignsListSkeleton } from '@/components/ui/skeletons';

export function CampaignsPage() {
  const { data, isLoading, error } = useCampaignsList({ page: 1, limit: 20 });

  if (isLoading) return <CampaignsListSkeleton />;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {data?.campaigns.map(c => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );
}
```

---

## 2️⃣ Configuração Backend (⏳ PRÓXIMO PASSO)

### Headers HTTP a Adicionar

Os **endpoints GET** devem retornar headers `Cache-Control` para permitir caching no navegador.

#### Endpoints com Cache Recomendado

| Endpoint | Cache | Motivo |
|----------|-------|--------|
| `GET /campaigns` | `max-age=300` (5 min) | Lista muda frequentemente |
| `GET /campaigns/:id` | `max-age=600` (10 min) | Detalhes menos voláteis |
| `GET /campaigns/:id/contributions` | `max-age=120` (2 min) | Contribuições são críticas |
| `GET /users/search` | `max-age=300` (5 min) | Busca pode ser cacheada |
| `GET /users/:id` | `max-age=600` (10 min) | Perfil muda raramente |
| `GET /uploads/*` | `max-age=31536000` (1 ano) | Imagens são imutáveis |
| `GET /notifications` | `max-age=60` (1 min) | Notificações precisam ser frescas |
| `GET /wallet/*` | `max-age=0, must-revalidate` | Sempre frescos, críticos |

#### Endpoints SEM Cache (Sempre Frescos)

```
POST, PUT, DELETE, PATCH → Sem cache
GET /wallet/* → max-age=0, must-revalidate
GET /friends/* → max-age=60 (dados sensíveis)
```

---

## 3️⃣ Implementação no Backend (NestJS)

### Exemplo: Campaign Service

```typescript
// src/campaigns/campaigns.controller.ts

import { Response } from '@nestjs/common';

@Get()
async findAll(
  @Query() dto: ListCampaignsDto,
  @CurrentUser() user: { userId: string },
  @Res() res: Response,
) {
  const result = await this.campaignsService.findAll(dto, user.userId);

  // Cache no navegador por 5 minutos
  res.header('Cache-Control', 'public, max-age=300');
  
  // Opcional: ETag para validação condicional
  const hash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify(result))
    .digest('hex');
  res.header('ETag', `"${hash}"`);

  return result;
}

@Get(':id')
async findOne(
  @Param('id') id: string,
  @CurrentUser() user: { userId: string },
  @Res() res: Response,
) {
  const campaign = await this.campaignsService.findOne(id, user.userId);

  // Cache por 10 minutos
  res.header('Cache-Control', 'public, max-age=600');

  return campaign;
}

@Post()
async create(
  @Body() dto: CreateCampaignDto,
  @CurrentUser() user: { userId: string },
  @Res() res: Response,
) {
  const campaign = await this.campaignsService.create(dto, user.userId);

  // POST: sem cache
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

  return campaign;
}
```

### Exemplo: Wallet Service

```typescript
// src/wallet/wallet.controller.ts

@Get('balance')
async getBalance(
  @CurrentUser() user: { userId: string },
  @Res() res: Response,
) {
  const balance = await this.walletService.getBalance(user.userId);

  // Saldo SEMPRE fresco - sem cache
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');

  return balance;
}

@Post('transfer')
async transfer(
  @Body() dto: TransferDto,
  @Res() res: Response,
) {
  // Mutations: sem cache
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  return this.walletService.transfer(dto);
}
```

### Middleware Global (Alternativa)

Se quiser aplicar em todos os endpoints:

```typescript
// src/common/middlewares/cache.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  use(req: any, res: Response, next: () => void) {
    const method = req.method;
    const path = req.path;

    if (method === 'GET') {
      if (path.includes('/wallet') && path !== '/wallet/balance') {
        res.header('Cache-Control', 'public, max-age=120');
      } else if (path.includes('/uploads')) {
        res.header('Cache-Control', 'public, max-age=31536000'); // 1 ano
      } else if (path.includes('/campaigns')) {
        res.header('Cache-Control', 'public, max-age=300'); // 5 min
      } else {
        res.header('Cache-Control', 'public, max-age=600'); // 10 min default
      }
    } else {
      // Mutations: sem cache
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    next();
  }
}

// app.module.ts
@Module({
  imports: [...],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CacheMiddleware)
      .forRoutes('*'); // Aplicar a todas as rotas
  }
}
```

---

## 4️⃣ Padrões de Uso no Frontend

### Padrão 1: Skeleton → Dados → Cache

```tsx
// Página de Campanhas
export function CampaignsPage() {
  const { data, isLoading } = useCampaignsList({ page: 1 });

  return (
    <>
      {isLoading && <CampaignsListSkeleton />}
      {data && renderCampaigns(data.campaigns)}
    </>
  );
}
```

### Padrão 2: Mutation + Invalidação

```tsx
// Form de criar campanha
export function CreateCampaignForm() {
  const { mutate, isPending } = useCreateCampaign();

  const handleSubmit = (payload: CreateCampaignPayload) => {
    mutate(payload, {
      onSuccess: (campaign) => {
        // Cache invalidado automaticamente
        router.push(`/vaquinhas/${campaign.id}`);
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Padrão 3: Dados Críticos com RefetchOnFocus

```tsx
// Dashboard da Carteira
export function WalletDashboard() {
  // Saldo refetch automaticamente quando a aba volta em foco
  const { balance, isLoading } = useWalletBalance();

  return (
    <div>
      {isLoading ? <WalletSkeleton /> : <WalletBalance balance={balance} />}
    </div>
  );
}
```

---

## 5️⃣ Checklist de Implementação

### Backend
- [ ] Adicionar `Cache-Control` headers em endpoints GET (campaigns, users, etc.)
- [ ] Adicionar `no-cache` em mutações (POST, PUT, DELETE)
- [ ] Adicionar `no-cache` em endpoints sensíveis (/wallet/balance)
- [ ] Testar headers com `curl -I` ou DevTools Network tab
- [ ] Verificar se ETags funcionam (opcional)

### Frontend
- [ ] ✅ React Query instalado e configurado
- [ ] ✅ QueryClientProvider integrado em `app/providers.tsx`
- [ ] ✅ Hooks React Query criados (campaigns, wallet)
- [ ] ✅ Skeletons criados para UIs
- [ ] Usar `useCampaignsList`, `useWalletBalance` nas páginas
- [ ] Aplicar `<CampaignsListSkeleton />` enquanto carregam
- [ ] Testar DevTools Network tab: "cached" vs "from network"

---

## 6️⃣ Performance Esperado

Com essa estratégia:

| Métrica | Esperado |
|---------|----------|
| Tempo até esqueleto (TTI) | <200ms |
| Tempo até dados (LCP) | <1s (cache) / <2s (fresh) |
| Tempo reload com cache HTTP | <300ms |
| Redução de requisições | ~60% |

---

## 7️⃣ Referências

- React Query Docs: https://tanstack.com/query
- HTTP Caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- NestJS Response: https://docs.nestjs.com/techniques/caching
- Cache-Control Header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
