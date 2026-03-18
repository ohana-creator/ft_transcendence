# Guia de Integração - Vaquinhas Privadas

## 📌 Status Atual

A página de vaquinhas privadas está implementada com:
- ✅ UI/UX completa
- ✅ Componentes modais reutilizáveis
- ✅ Validações de formulário
- ✅ Modais de gerencimento (membros, configurações, convites)
- ⏳ **Integração com API** (Em progresso)

## 🔌 Como Integrar com a API

### 1. Usar o Serviço de API

Importe o serviço criado em `utils/vaquinhasPrivadas.ts`:

```tsx
import {
  listPrivateCampaigns,
  getCampaignDetails,
  createCampaign,
  updateCampaign,
  listMembers,
  promoteMember,
  removeMember,
  sendInvite,
  contributeToCampaign
} from '@/utils/vaquinhasPrivadas';
```

### 2. Exemplo: Listar Vaquinhas

**Antes (com dados mockados):**
```tsx
const mockVaquinhas: Vaquinha[] = [
  { id: 1, title: 'Viagem...', ... },
  // ...
];
```

**Depois (com API):**
```tsx
import { usePrivateCampaigns } from '@/utils/vaquinhasPrivadas';

export default function VaquinhasPrivadasPage() {
  const { campaigns, loading, error, refetch } = usePrivateCampaigns();
  
  return (
    <>
      {loading && <p>Carregando...</p>}
      {error && <p>Erro: {error}</p>}
      {campaigns.map(campaign => (
        // renderizar...
      ))}
    </>
  );
}
```

### 3. Exemplo: Criar Vaquinha Privada

**No arquivo `/app/vaquinhas/privadas/criar/page.tsx`:**

```tsx
import { createCampaign } from '@/utils/vaquinhasPrivadas';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const response = await createCampaign({
      title: formData.title,
      description: formData.description,
      isPrivate: true,
      goalAmount: parseFloat(formData.goalAmount),
      goalVisible: formData.goalVisible,
      deadline: formData.deadline
    });

    // Se tem membros para convidar
    if (formData.membersToInvite.length > 0) {
      for (const email of formData.membersToInvite) {
        await sendInvite(response.data.id, { email });
      }
    }

    // Redirecionar
    router.push('/vaquinhas/privadas');
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### 4. Exemplo: Gerir Membros

**Para promover:**
```tsx
const handlePromoteMember = async (userId: number) => {
  try {
    await promoteMember(selectedVaquinha.id, userId);
    // Recarregar lista de membros
    await refetchMembers();
  } catch (error) {
    console.error('Erro ao promover:', error);
  }
};
```

**Para remover:**
```tsx
const handleRemoveMember = async (userId: number) => {
  try {
    await removeMember(selectedVaquinha.id, userId);
    // Recarregar lista de membros
    await refetchMembers();
  } catch (error) {
    console.error('Erro ao remover:', error);
  }
};
```

### 5. Exemplo: Enviar Convites

```tsx
const handleSendInvite = async (email: string) => {
  try {
    await sendInvite(selectedVaquinha.id, { email });
    // Recarregar lista de convites
    await refetchInvites();
  } catch (error) {
    console.error('Erro ao enviar convite:', error);
  }
};
```

### 6. Exemplo: Contribuir

```tsx
const handleContribute = async () => {
  try {
    const response = await contributeToCampaign(
      selectedVaquinha.id,
      {
        amount: parseFloat(contributionAmount),
        message: contributionMessage
      }
    );

    // Mostrar sucesso
    alert('Contribuição enviada!');
    
    // Recarregar dados da vaquinha
    await refetchCampaignDetails();
  } catch (error) {
    console.error('Erro ao contribuir:', error);
  }
};
```

## 📋 Checklist de Integração

### Página de Listagem (`/vaquinhas/privadas`)
- [ ] Remover `mockVaquinhas` e usar `usePrivateCampaigns()`
- [ ] Conectar todos os `onClick` dos modais
- [ ] Integrar `handlePromoteMember` com `promoteMember()`
- [ ] Integrar `handleRemoveMember` com `removeMember()`
- [ ] Integrar `handleSendInvite` com `sendInvite()`
- [ ] Integrar `handleSaveSettings` com `updateCampaign()`
- [ ] Integrar `handleContribute` com `contributeToCampaign()`

### Página de Criação (`/vaquinhas/privadas/criar`)
- [ ] Integrar `handleSubmit` com `createCampaign()`
- [ ] Adicionar suporte a envio de convites iniciais
- [ ] Adicionar validação de resposta da API
- [ ] Implementar retry logic

### Componentes Modais
- [ ] `GerirMembrosModal`: Conectar calls de API
- [ ] `GerirConfiguracoesModal`: Implementar salvamento
- [ ] `GerirConvitesModal`: Conectar envio e cancelamento

## 🚀 Próximos Passos

1. **Começar pela página de listagem**
   - Substituir dados mockados por chamadas reais
   - Testar pagination
   - Adicionar loading states

2. **Depois a página de criação**
   - Testar validação
   - Testar envio de convites
   - Testar redirecionamento

3. **Por fim, os componentes**
   - Testar cada modal individualmente
   - Testar integração com API
   - Testar error handling

## 🐛 Tratamento de Erros

Adicionar try-catch em todas as chamadas:

```tsx
try {
  const result = await apiFunction();
  // Sucesso
} catch (error) {
  if (error.response?.status === 403) {
    // Sem permissão
  } else if (error.response?.status === 404) {
    // Não encontrado
  } else {
    // Outro erro
  }
}
```

## 📱 Loading States

Adicionar indicadores de progresso:

```tsx
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    // API call
  } finally {
    setLoading(false);
  }
};
```

## 🔄 Refresh Automático

Considerar usar polling ou WebSocket para atualizações em tempo real:

```tsx
// Polling (simples)
useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, 5000); // A cada 5 segundos
  
  return () => clearInterval(interval);
}, [refetch]);

// WebSocket (mais eficiente)
useEffect(() => {
  const ws = new WebSocket('/ws/campaigns/1');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    refetch();
  };
  return () => ws.close();
}, []);
```

## 📝 Notas Importantes

1. **Autenticação**: Todos os endpoints requerem header `Authorization: Bearer <token>`
2. **Validação Backend**: O backend valida todas as regras, confiar na validação
3. **Notificações**: Implementar toast/notificações para feedback
4. **Segurança**: Nunca expor tokens ou dados sensíveis no console
5. **Performance**: Cachear dados quando possível

## ❓ Dúvidas Comuns

### P: Como testar sem backend?
R: Continue usando os dados mockados temporariamente. Ou use Mirage.js/Mock Service Worker.

### P: Como lidar com offline?
R: Implementar cache com localStorage ou Service Workers.

### P: Como manter sincronizado com múltiplos tabs?
R: Usar BroadcastChannel API ou localStorage sync.

## 📚 Referências

- [Documentação completa](/docs/VAQUINHAS_PRIVADAS.md)
- [API Endpoints - Seção 6](/docs/API_ENDPOINTS.md)
- [Arquivo de Serviços](/utils/vaquinhasPrivadas.ts)
