# Vaquinhas Privadas - Documentação Técnica

## 📋 Visão Geral

As Vaquinhas Privadas são campanhas de poupança coletiva restrita a membros convidados. Um único criador (`OWNER`) gerencia a vaquinha, pode promover membros a administradores (`SUDO`), e definir regras internas.

## 🏗️ Arquitetura

### Páginas

#### 1. **Listagem de Vaquinhas Privadas**
- **Rota:** `/vaquinhas/privadas`
- **Arquivo:** `app/vaquinhas/privadas/page.tsx`
- **Responsabilidades:**
  - Listar todas as vaquinhas privadas do utilizador
  - Filtrar e buscar por título
  - Selecionar vaquinha para ver detalhes
  - Exibir informações consolidadas (membros, contribuições, progresso)
  - Acesso ao modal de membros (se OWNER/SUDO)
  - Acesso ao modal de configurações (se OWNER)
  - Contribuir para a vaquinha

#### 2. **Criar Nova Vaquinha Privada**
- **Rota:** `/vaquinhas/privadas/criar`
- **Arquivo:** `app/vaquinhas/privadas/criar/page.tsx`
- **Responsabilidades:**
  - Formulário com validação
  - Definir regras internas (objetivo, data limite, visibilidade)
  - Adicionar membros para convidar inicialmente
  - Calcular e exibir resumo antes de criar
  - Integração com API (`POST /campaigns`)

### Componentes Reutilizáveis

#### 1. **GerirMembrosModal** (`components/GerirMembrosModal.tsx`)
```tsx
interface GerirMembrosModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  memberCount: number;
  canManage: boolean; // true se OWNER ou SUDO
  onPromoteMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  onInviteMember: () => void;
}
```

**Funcionalidades:**
- Listar todos os membros com avatares
- Buscar membro por username
- Promover membro a SUDO (apenas OWNER)
- Remover membro (apenas OWNER)
- Botão para convidar novo membro

#### 2. **GerirConfiguracoesModal** (`components/GerirConfiguracoesModal.tsx`)
```tsx
interface GerirConfiguracoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VaquinhaSettings;
  onSave: (settings: VaquinhaSettings) => void;
  canEdit: boolean; // true apenas se OWNER
}
```

**Funcionalidades:**
- Editar título, descrição, objetivo
- Controlar visibilidade do objetivo
- Definir data limite e mínimo de contribuição
- Validação de campos
- Feedback visual de salvamento

#### 3. **GerirConvitesModal** (`components/GerirConvitesModal.tsx`)
```tsx
interface GerirConvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  invites: Invite[];
  onSendInvite: (email: string) => void;
  onCancelInvite: (inviteId: number) => void;
}
```

**Funcionalidades:**
- Enviar convites por email
- Link de convite copyável
- Listar convites pendentes
- Listar convites aceites
- Cancelar convites pendentes

## 🔄 Fluxos de Dados

### 1. Criação de Vaquinha Privada

```
Utilizador preenche formulário
        ↓
Validação de campos (Frontend)
        ↓
POST /campaigns
  {
    title: string
    description: string
    isPrivate: true
    goalAmount: number
    goalVisible: boolean
    deadline: string
  }
        ↓
Backend cria campanha e retorna ID
        ↓
POST /campaigns/:id/invite (para cada membro)
  {
    email: string
  }
        ↓
Redirecionamento para /vaquinhas/privadas
```

### 2. Gerenciar Membros

```
Utilizador clica em ícone de membros
        ↓
Modal abre com lista de membros
        ↓
Ações possíveis:
  - Promover: POST /campaigns/:id/members/:userId/promote
  - Remover: DELETE /campaigns/:id/members/:userId
  - Convidar: POST /campaigns/:id/invite
```

### 3. Editar Configurações

```
Utilizador clica em ícone de configurações
        ↓
Modal abre com formulário pré-preenchido
        ↓
Utilizador edita campos
        ↓
PUT /campaigns/:id
  {
    title: string
    description: string
    goalAmount: number
    goalVisible: boolean
    deadline: string
  }
        ↓
Feedback visual de sucesso
```

### 4. Contribuir para Vaquinha

```
Utilizador preenche valor
        ↓
POST /campaigns/:id/contribute
  {
    amount: number
    message: string (opcional)
  }
        ↓
Transação processada
        ↓
Saldo atualizado
        ↓
Notificação enviada ao criador
```

## 📊 Tipos de Dados

### Vaquinha (Campanha Privada)
```typescript
interface Vaquinha {
  id: number;
  title: string;
  description: string;
  isPrivate: boolean; // sempre true
  goalAmount: number;
  currentAmount: number;
  goalVisible: boolean;
  deadline: string; // ISO 8601
  ownerId: number;
  ownerUsername: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  memberCount: number;
  contributionCount: number;
  role: 'OWNER' | 'SUDO' | 'VAKER'; // papel do utilizador
}
```

### Membro
```typescript
interface Member {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  role: 'SUDO' | 'VAKER';
  joinedAt: string; // ISO 8601
}
```

### Convite
```typescript
interface Invite {
  id: number;
  invitedEmail: string;
  inviterName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string; // ISO 8601
}
```

## 🔐 Controle de Acesso

### Operações e Permissões

| Operação | OWNER | SUDO | VAKER |
|----------|-------|------|-------|
| Ver vaquinha | ✓ | ✓ | ✓ |
| Editar configurações | ✓ | ✗ | ✗ |
| Promover membro | ✓ | ✗ | ✗ |
| Remover membro | ✓ | ✗ | ✗ |
| Convidar membro | ✓ | ✓ | ✗ |
| Contribuir | ✓ | ✓ | ✓ |
| Aceitar convite | ✓ | ✓ | ✓ |
| Gerir membros | ✓ | ✓ | ✗ |

## 🎨 UI/UX Considerations

### Layout Principal
- **Sidebar:** Lista de vaquinhas com search
- **Content:** Detalhes da vaquinha selecionada
- **Cards:** Progresso, membros, contribuições, regras

### Modais
- **Membros:** Grid scrollável com ações contextuais
- **Configurações:** Formulário com disabled state
- **Convites:** Tabs para PENDING/ACCEPTED

### Validações
- **Título:** 5-100 caracteres
- **Descrição:** 20-5000 caracteres
- **Objetivo:** > 0
- **Data Limite:** Data futura
- **Email:** Formato válido

## 📱 Estados e Feedback

### Loading States
- Botões com texto "Guardando..."
- Indicador de progresso no formulário
- Skeleton screens para listas

### Success States
- Toast ou feedback visual "Guardado com sucesso"
- Atualização automática da UI
- Redirecionamento após criação

### Error States
- Mensagens de erro inline
- Toast com descrição do erro
- Possibilidade de retry

## 🔄 Integração com API

### Endpoints Utilizados

```
GET    /campaigns?page=1&limit=20&status=ACTIVE
GET    /campaigns/:id
GET    /campaigns/:id/members?page=1&limit=20
GET    /campaigns/:id/invitations?status=PENDING

POST   /campaigns
POST   /campaigns/:id/contribute
POST   /campaigns/:id/members/:userId/promote
POST   /campaigns/:id/invite

PUT    /campaigns/:id

DELETE /campaigns/:id/members/:userId
DELETE /campaigns/:id
```

## 📝 Próximas Etapas

### Phase 2 - Funcionalidades Avançadas
1. [ ] Histórico de transações filtrado por vaquinha
2. [ ] Relatórios e estatísticas
3. [ ] Notificações em tempo real
4. [ ] Webhooks para eventos

### Phase 3 - Otimizações
1. [ ] Paginação na lista de membros
2. [ ] Cache de vaquinhas
3. [ ] Sync offline
4. [ ] PWA offline support

## 🚀 Como Usar

### Importar Componentes
```tsx
import {
  GerirMembrosModal,
  GerirConfiguracoesModal,
  GerirConvitesModal
} from '@/components';
```

### Exemplo de Implementação
```tsx
'use client';

import { useState } from 'react';
import { GerirMembrosModal } from '@/components';

export default function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Gerir Membros
      </button>
      
      <GerirMembrosModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        members={members}
        memberCount={5}
        canManage={true}
        onPromoteMember={handlePromote}
        onRemoveMember={handleRemove}
        onInviteMember={handleInvite}
      />
    </>
  );
}
```

## 📋 Checklist de Implementação

- [x] Página de listagem de vaquinhas privadas
- [x] Página de criação de vaquinha privada
- [x] Modal de gerenciar membros
- [x] Modal de configurações
- [x] Modal de convites
- [x] Validação de formulários
- [x] Estados de loading/sucesso/erro
- [ ] Integração real com API
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação de API
