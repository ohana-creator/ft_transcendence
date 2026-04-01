# 🧭 Mapa de Navegação - Vaquinhas

## 📍 Estrutura de Rotas

```
/vaquinhas
├── page.tsx .......................... Hub principal com abas
│
├── /publicas
│   └── page.tsx ..................... Listagem de vaquinhas públicas
│
├── /privadas
│   ├── page.tsx ..................... Listagem de minhas vaquinhas
│   ├── /criar
│   │   └── page.tsx ................ Formulário de criar vaquinha
│   └── /[id]
│       ├── page.tsx ................ Detalhes da vaquinha privada
│       └── /join
│           └── page.tsx ........... Aceitar convite de vaquinha
│
└── /[id]
    └── page.tsx .................... Detalhes de vaquinha pública (a criar)
```

## 🔄 Fluxos de Navegação

### Fluxo 1: Navegar entre Públicas e Privadas
```
/vaquinhas (Hub)
├─ [Aba: Vaquinhas Públicas] → /vaquinhas/publicas
├─ [Aba: Minhas Vaquinhas] → /vaquinhas/privadas
└─ [Botão: Nova Vaquinha] → /vaquinhas/privadas/criar
```

### Fluxo 2: Criar Vaquinha Privada
```
/vaquinhas/privadas
├─ [Nova Vaquinha] 
│  ↓
/vaquinhas/privadas/criar
├─ [Preencher formulário]
├─ [Validar]
├─ [Enviar]
│  ↓
/vaquinhas/privadas
└─ [Listar atualizada]
```

### Fluxo 3: Ver Detalhes da Vaquinha
```
/vaquinhas/privadas
├─ [Clica na vaquinha]
│  ↓
/vaquinhas/privadas/[id]
├─ [Ver detalhes completos]
├─ [Opções: Gerir membros, Configurações, Convites]
├─ [Contribuir]
│  ↓
[Voltar] ← /vaquinhas/privadas
```

### Fluxo 4: Aceitar Convite
```
Email com link
├─ https://app/vaquinhas/privadas/[id]/join
│  ↓
/vaquinhas/privadas/[id]/join
├─ [Ver detalhes da vaquinha]
├─ [Botão: Aceitar] ou [Rejeitar]
├─ Se Aceitar → /vaquinhas/privadas/[id]
└─ Se Rejeitar → /vaquinhas/privadas
```

## 🎯 Pontos de Entrada

### 1. Hub Principal (`/vaquinhas`)
- **Acesso:** Menu principal, navbar
- **Função:** Switcher entre seções
- **Componentes:** 
  - Abas (Públicas/Privadas)
  - Botão "Nova Vaquinha"

### 2. Listagem Privadas (`/vaquinhas/privadas`)
- **Acesso:** Via Hub ou Link direto
- **Função:** Listar todas as minhas vaquinhas
- **Componentes:**
  - Search/Filter
  - Lista de vaquinhas
  - Botão "Nova Vaquinha"
  - Voltar para Hub

### 3. Criar Vaquinha (`/vaquinhas/privadas/criar`)
- **Acesso:** Botão "Nova Vaquinha"
- **Função:** Formulário completo
- **Componentes:**
  - Campos básicos
  - Regras
  - Convidar membros
  - Resumo
  - Cancelar/Criar

### 4. Detalhes Privada (`/vaquinhas/privadas/[id]`)
- **Acesso:** Clicando em vaquinha na listagem
- **Função:** Ver tudo sobre a vaquinha
- **Componentes:**
  - Descrição
  - Progresso
  - Info cards
  - Regras
  - Contribuir
  - Botões de gerencimento (OWNER/SUDO)
  - Modals (Membros, Configurações, Convites)

### 5. Aceitar Convite (`/vaquinhas/privadas/[id]/join`)
- **Acesso:** Link do email
- **Função:** Interface de aceitação
- **Componentes:**
  - Info da vaquinha
  - Botões: Aceitar/Rejeitar
  - Feedback visual

## 📊 Componentes de Navegação

### Header com Abas
```tsx
// Em /vaquinhas/page.tsx
<div className="flex gap-2">
  <button onClick={() => router.push('/vaquinhas/publicas')}>
    🌍 Vaquinhas Públicas
  </button>
  <button onClick={() => router.push('/vaquinhas/privadas')}>
    🔒 Minhas Vaquinhas
  </button>
</div>
```

### Botão Voltar
```tsx
// Em páginas filhas
<button onClick={() => router.push('/vaquinhas')}>
  ← Voltar
</button>

// Ou para voltar para lista
<button onClick={() => router.push('/vaquinhas/privadas')}>
  ← Voltar para Vaquinhas
</button>
```

### Link Aceitar Convite
```tsx
// Gerado no modal de convites
const linkConvite = `/vaquinhas/privadas/${campaignId}/join`;

// Email template
<a href={linkConvite}>
  Aceitar convite para {campaignName}
</a>
```

## 🔐 Controle de Acesso por Rota

| Rota | Público | Autenticado | OWNER | SUDO | VAKER |
|------|---------|------------|-------|------|-------|
| /vaquinhas | ✗ | ✓ | ✓ | ✓ | ✓ |
| /vaquinhas/publicas | ✓ | ✓ | ✓ | ✓ | ✓ |
| /vaquinhas/privadas | ✗ | ✓ | ✓ | ✓ | ✓ |
| /vaquinhas/privadas/criar | ✗ | ✓ | ✓ | ✓ | ✓ |
| /vaquinhas/privadas/[id] | ✗ | ✓ | ✓ | ✓ | ✓ |
| /vaquinhas/privadas/[id]/join | ✗ | ✓ | ✓ | ✓ | ✓ |

## 📱 Navegação Mobile

### Menu Hamburger
```
☰ Menu
├─ Vaquinhas Públicas
├─ Minhas Vaquinhas
├─ + Nova Vaquinha
└─ [Outros]
```

### Breadcrumb (em desktop)
```
Vaquinhas > Privadas > Viagem Zanzibar > Editar
```

## 🚀 Próximas Rotas

### Futuras Implementações
- `/vaquinhas/publicas/[id]` - Detalhes de vaquinha pública
- `/vaquinhas/historico` - Histórico de transações
- `/vaquinhas/minhas-contribuicoes` - Ver minhas contribuições
- `/vaquinhas/convites` - Gerenciar convites recebidos
- `/vaquinhas/arquivadas` - Vaquinhas encerradas

## 💡 Dicas de Implementação

### State Management
```tsx
// Usar pathname para determinar aba ativa
const pathname = usePathname();
const isPrivate = pathname.includes('/privadas');
const isPublic = pathname.includes('/publicas');
```

### Redirecionamentos Inteligentes
```tsx
// Após criar vaquinha, voltar para listagem
router.push('/vaquinhas/privadas');

// Após aceitar convite, ir para detalhes
router.push(`/vaquinhas/privadas/${campaignId}`);

// Após rejeitar, voltar para listagem
router.push('/vaquinhas/privadas');
```

### Loading States
```tsx
// Durante transição entre páginas
<Suspense fallback={<Loading />}>
  <VaquinhasContent />
</Suspense>
```

## 📞 Referência Rápida

**De volta do Hub:**
- `/vaquinhas` → Exibir abas
- Clicar aba → `router.push('/vaquinhas/privadas')`

**De listagem privada:**
- `[Nova Vaquinha]` → `/vaquinhas/privadas/criar`
- `[Clicar vaquinha]` → `/vaquinhas/privadas/[id]`
- `[Voltar]` → `/vaquinhas`

**De detalhes privada:**
- `[Voltar]` → `/vaquinhas/privadas`
- `[Editar]` → Modal inline ou `/vaquinhas/privadas/[id]/editar` (futuro)

**De aceitar convite:**
- `[Aceitar]` → `/vaquinhas/privadas/[id]` + Membro adicionado
- `[Rejeitar]` → `/vaquinhas/privadas` + Convite rejeitado
