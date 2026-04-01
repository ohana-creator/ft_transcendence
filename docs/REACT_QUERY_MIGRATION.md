# Guia de Migração: Contextos → React Query

## Objetivo
Migrar páginas de Contextos (VaquinhasProvider, CarteiraProvider) para React Query com melhor performance e caching.

---

## ❌ Antes: Usando Contextos

```tsx
// app/(app)/vaquinhas/page.tsx (Antigo)
'use client';

import { useVaquinhasContext } from '@/contexts/vaquinhas';
import { CampaignCard } from '@/components';

export default function VaquinhasPage() {
  const { campaigns, loading, error, fetchCampaigns } = useVaquinhasContext();

  useEffect(() => {
    fetchCampaigns({ page: 1, limit: 20 });
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      {campaigns.map(c => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );
}
```

**Problemas:**
- ❌ Sem skeleton screens (apenas loading text)
- ❌ Sem caching HTTP (requisita sempre)
- ❌ Estado global pollui memória
- ❌ Hard para testar

---

## ✅ Depois: Usando React Query

```tsx
// app/(app)/vaquinhas/page.tsx (Novo)
'use client';

import { useCampaignsList } from '@/hooks/react-query';
import { CampaignsListSkeleton, CampaignCard } from '@/components';

export default function VaquinhasPage() {
  const { data, isLoading, error } = useCampaignsList({
    page: 1,
    limit: 20,
    status: 'ACTIVE',
  });

  // Skeleton enquanto carrega
  if (isLoading) return <CampaignsListSkeleton />;

  // Erro
  if (error) return <div className="text-red-500">Erro: {error.message}</div>;

  // Dados carregados
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {data?.campaigns.map(campaign => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
```

**Benefícios:**
- ✅ Skeleton screen automático
- ✅ Cache automático (5 min por padrão)
- ✅ Dedupação de requisições
- ✅ Mais fácil testar
- ✅ Melhor performance

---

## 📋 Padrões de Migração

### 1️⃣ Lista com Paginação

**Antes:**
```tsx
const { campaigns, meta, loading } = useVaquinhasContext();
const handleNextPage = () => fetchCampaigns({ page: meta!.page + 1 });
```

**Depois:**
```tsx
const [page, setPage] = useState(1);
const { data, isLoading } = useCampaignsList({ page, limit: 20 });

const handleNextPage = () => setPage(p => p + 1);
```

React Query **deduplica requisições** automaticamente via `dedupeInterval`.

---

### 2️⃣ Detalhe com Refetch Manual

**Antes:**
```tsx
const { currentCampaign } = useVaquinhasContext();

useEffect(() => {
  fetchCampaign(id);
}, [id]);

const handleContribute = async (payload) => {
  await contribute(id, payload);
  // Precisava refetch manual
  fetchCampaign(id);
};
```

**Depois:**
```tsx
const { data: campaign, refetch } = useCampaignDetail(id);
const { mutate: contribute } = useContributeToCampaign(id);

const handleContribute = (payload) => {
  contribute(payload, {
    onSuccess: () => {
      // Invalidação automática - refetch acontece sozinho
    },
  });
};
```

React Query **invalida cache automaticamente** após mutations.

---

### 3️⃣ Carteira/Wallet

**Antes:**
```tsx
const { saldo, transacoes, loading } = useCarteiraContext();

const handleTopup = async (amount) => {
  const { checkoutUrl } = await criarTopup(amount);
  // Polling manual com setTimeout
  while (true) {
    const status = await checkStatus();
    if (status === 'COMPLETED') break;
    await sleep(5000);
  }
  // Refetch manual
  atualizarCarteira();
};
```

**Depois:**
```tsx
const { balance, transactions, isLoading } = useWalletDashboard();
const { mutate: createTopup } = useCreateTopup();
const { mutate: confirmTopup } = useConfirmTopupStatus();

const handleTopup = async (amount) => {
  createTopup(amount, {
    onSuccess: (data) => {
      // Redireciona para checkout
      window.location.href = data.checkoutUrl;
      
      // Ao voltar (callback), confirma status
      confirmTopup(transactionId, {
        onSuccess: (status) => {
          // Balance refetch automático via invalidateQueries
          if (status === 'COMPLETED') {
            // Cache invalidado, nova requisição já feita
          }
        },
      });
    },
  });
};
```

**Alterações:**
- ✅ Sem polling manual (React Query faz re-fetch)
- ✅ Sem setTimeout (staleTime/gcTime)
- ✅ Refetch automático após mutation

---

## 🔄 Estratégia de Migração Gradual

Não precisa migrar tudo de uma vez! Pode coexistir:

```tsx
// Usar React Query onde precisa de cache
const { data: campaigns } = useCampaignsList();

// Usar Contexto para estado global se ainda precisar
const { contribute } = useVaquinhasContext();
```

**Faseamento sugerido:**
1. **Fase 1:** Páginas de listagem (`/vaquinhas`, `/carteira`)
2. **Fase 2:** Páginas de detalhe (`/vaquinhas/:id`)
3. **Fase 3:** Formulários e mutations
4. **Fase 4:** Remover contextos antigos (opcional)

---

## 🧪 Testando Mudanças

### DevTools Network Tab

1. Abra DevTools → Network tab
2. Refresque a página
3. Procure por status "200 (from cache)" - significa que React Query usou dados do cache
4. Second fetch do mesmo endpoint deve ser **reduzido ou inexistente**

### React Query DevTools (Opcional)

Instale para visualizar:
```bash
npm install @tanstack/react-query-devtools
```

Use no Providers:
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children }) {
  return (
    <QueryClientProvider>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

---

## ⚠️ Cuidados na Migração

### 1. Estado Crítico do Usuário
Se dependia da **stale data** do contexto (ex: `currentCampaign` sempre disponível), pode precisar:

```tsx
// Em vez de depender do estado, fazer query explícita
const { data: campaign } = useCampaignDetail(id);

if (!campaign) return <Skeleton />;
```

### 2. Refetch Explícita
Se precisar forçar refetch:

```tsx
const { data, refetch } = useCampaignsList();

// Refetch manual
const handleManualRefresh = () => {
  refetch();
};
```

### 3. Query Keys Consistentes
React Query usa **queryKey** para cache, então ser consistente é crítico:

```tsx
// ✅ CORRETO
const { data: c1 } = useCampaignsList({ page: 1, limit: 20 });
const { data: c2 } = useCampaignsList({ page: 1, limit: 20 });
// Mesma query key → mesmo cache

// ❌ ERRADO
const { data: c1 } = useCampaignsList({ limit: 20, page: 1 });
const { data: c2 } = useCampaignsList({ page: 1, limit: 20 });
// Ordem diferente → query keys diferentes!
```

---

## 📊 Exemplo Completo: Página de Campanhas

```tsx
// app/(app)/vaquinhas/page.tsx (Refatorada)
'use client';

import { useState } from 'react';
import { useCampaignsList } from '@/hooks/react-query';
import { CampaignsListSkeleton } from '@/components/ui/skeletons';
import { CampaignCard } from '@/components';
import { useI18n } from '@/locales';

export default function VaquinhasPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'ACTIVE' });

  // Query com cache automático
  const { data, isLoading, error, refetch } = useCampaignsList({
    page,
    limit: 20,
    ...filters,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">{t.vaquinhas.todas}</h1>
        <CampaignsListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{t.errors.loading}: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">{t.vaquinhas.todas}</h1>

      {/* Grid de campanhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {data?.campaigns.map(campaign => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>

      {/* Paginação */}
      <div className="flex gap-4 justify-center">
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {t.previous}
        </button>

        <span className="px-4 py-2">
          Página {page} de {data?.meta?.pages || 1}
        </span>

        <button
          disabled={page >= (data?.meta?.pages || 1)}
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {t.next}
        </button>
      </div>
    </div>
  );
}
```

---

## 🎉 Resultado

- ⚡ Página carrega instantly com skeleton
- 📊 Dados em cache por 5 minutos
- 🔄 Refetch automático nos segundo/terceio acess
- ✅ Invalidação automática após mutations
- 📱 Melhor performance em mobile
- 🧪 Mais fácil testar

