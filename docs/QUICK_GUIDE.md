# 📋 Quick Reference Guide - VAKS Frontend

## 👥 Quem Trabalha Onde?

| Area | Responsável | Pastas |
|------|---|---|
| **Login / Registo** | 🔵 Shelby | `app/auth/`, `components/auth/`, `hooks/auth/`, `contexts/auth/` |
| **Perfil do Utilizador** | 🔵 Shelby | `app/perfil/`, `components/profile/` |
| **Dashboard** | 🔵 Shelby | `app/dashboard/`, `components/dashboard/`, `contexts/dashboard/` |
| **Landing Page** | 🔵 Shelby | `app/(landing)/` |
| **Layout & Navbar** | 🔵 Shelby | `components/layout/` |
| **Vaquinhas Públicas** | 🟢 Joisson | `app/vaquinhas/publicas/`, `components/vaquinhas/` |
| **Vaquinhas Privadas** | 🟢 Joisson | `app/vaquinhas/privadas/`, `components/vaquinhas/` |
| **Carteira VAKS** | 🟢 Joisson | `app/carteira/`, `components/carteira/`, `contexts/carteira/`, `hooks/carteira/` |
| **Real-Time WebSocket** | 🟢 Joisson | `components/realtime/`, `hooks/websocket/`, `contexts/` |
| **API Calls** | 🟢 Joisson | `utils/api/` |
| **Styling Utilities** | 🔵 Shelby | `utils/styling/` (cn.ts) |

---

## 🚀 Commands Úteis

```bash
# Desenvolvimento
npm run dev                # Iniciar servidor local (http://localhost:3000)

# Testes
npm run lint              # Rodar ESLint
npm run type-check        # Verificar tipos TypeScript

# Build
npm run build             # Build para produção
npm start                 # Rodar build de produção

# Limpeza
npm run clean             # Remover .next e node_modules
```

---

## 📦 Como Importar Corretamente

### ✅ Use Barrel Exports
```typescript
// Componentes
import { VaquinhaCard, ProgressBar } from '@/components/vaquinhas';
import { Navbar } from '@/components/layout';

// Hooks
import { useCarteira } from '@/hooks/carteira';
import { useVaquinhas, useVaquinhaDetalhe } from '@/hooks/vaquinhas';

// Contextos
import { CarteiraProvider, useCarteiraContext } from '@/contexts/carteira';

// Utils
import * as currencyUtils from '@/utils/currency';
```

### ❌ Evite Importar Diretamente
```typescript
// ❌ NÃO FAÇA ISTO
import VaquinhaCard from '@/components/vaquinhas/VaquinhaCard';
import { useCarteira } from '@/hooks/carteira/useCarteira';
```

---

## 🔄 Fluxo de Desenvolvimento

### 1️⃣ Criar Feature Branch
```bash
git checkout -b feature/nome-da-feature
# Exemplo: feature/login-form, feature/carteira-saldo
```

### 2️⃣ Desenvolver
- Criar/editar arquivos na sua área de responsabilidade
- Seguir a estrutura de pastas
- Atualizar barrel exports (`index.ts`) se criar novos arquivos

### 3️⃣ Testar Localmente
```bash
npm run dev
npm run lint
npm run type-check
```

### 4️⃣ Commit e Push
```bash
git add .
git commit -m "Descrição clara do que foi feito"
git push origin feature/nome-da-feature
```

### 5️⃣ Pull Request
- Descrever mudanças no PR
- Mencionar se integra com outra pessoa
- Aguardar aprovação antes de merge

---

## 🤝 Integração Entre Equipes

### Shelby precisa de Joisson para:
- ✅ Componentes de saldo da carteira (Perfil)
- ✅ Notificações em tempo real (Dashboard)
- ✅ Histórico de transações (Perfil)
- ✅ Status das vaquinhas (Dashboard)

### Joisson precisa de Shelby para:
- ✅ Auth Context e user data
- ✅ Guarda de rotas (route protection)
- ✅ Sistema de notificações

**Checklist de Integração:**
- [ ] Comunicar mudanças em contextos compartilhados
- [ ] Manter tipos TypeScript sincronizados
- [ ] Testar integração antes de PR final

---

## 📝 Estrutura de um Novo Componente

### Para Shelby (exemplo: novo componente de dashboard)
```
components/
└── dashboard/
    ├── NovoComponente.tsx    # Componente
    ├── index.ts              # Exportar aqui
    
// Em components/dashboard/index.ts
export { default as NovoComponente } from './NovoComponente';

// Em components/index.ts - Adicionar se necessário
export * from './dashboard';
```

### Para Joisson (exemplo: novo componente de vaquinha)
```
components/
└── vaquinhas/
    ├── NovoComponente.tsx
    └── index.ts

// Mesmo padrão que acima
```

---

## 🐛 Debugging

### Console Logs
```typescript
// Em development
console.log('Debug:', variable);

// Nunca commitar console.logs em production
```

### React DevTools
```bash
# Instalar extensão Chrome/Firefox
# React DevTools permite inspecionar componentes e context
```

### Network Tab
- Verificar chamadas API em Development Tools > Network
- Verificar WebSocket connections em Console > Network

---

## ❓ FAQ

**P: Como adiciono um novo hook?**
R: Crie em `hooks/[funcionalidade]/novoHook.ts` e exporte em `hooks/[funcionalidade]/index.ts`

**P: Como crio um novo Context?**
R: Crie em `contexts/[funcionalidade]/NovoContext.tsx` e exporte em `contexts/[funcionalidade]/index.ts`

**P: Como adiciono um novo utilitário?**
R: Crie em `utils/[categoria]/novoUtil.ts` e exporte em `utils/[categoria]/index.ts`

**P: Posso adicionar dependências (npm)?**
R: Comunique com o colega primeiro e adicione com `npm install`

**P: Como atualizo tipos TypeScript compartilhados?**
R: Edite `types/index.ts` e comunique as mudanças ao colega

---

## 🎯 Checklist Antes de PR

- [ ] Código segue a estrutura de pastas
- [ ] Barrel exports estão atualizados
- [ ] Sem console.logs desnecessários
- [ ] TypeScript sem erros (`npm run type-check`)
- [ ] ESLint passou (`npm run lint`)
- [ ] Testou localmente com `npm run dev`
- [ ] Descreveu mudanças no commit/PR
- [ ] Mencionou dependências de outro dev se houver

---

**Dúvidas? Comunique com seu colega!** 💬
