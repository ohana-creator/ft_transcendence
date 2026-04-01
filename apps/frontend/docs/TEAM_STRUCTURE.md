# VAKS Frontend - Estrutura de Projeto e Divisão de Responsabilidades

## 📋 Visão Geral

O projeto VAKS é dividido entre **2 desenvolvedores**:
- **Pessoa 1: Shelby** - Core & Auth + Dashboards + Landing Page
- **Pessoa 2: Joisson** - Vaquinhas & Real-Time + Carteira VAKS

---

## 🏗️ Estrutura de Pastas

```
vaks-frontend/
├── app/                          # Next.js App Router
│   ├── (landing)/               # 🔵 SHELBY - Landing Page (grupo de rota privado)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── auth/                    # 🔵 SHELBY - Autenticação
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── dashboard/               # 🔵 SHELBY - Dashboard Principal
│   │   └── page.tsx
│   ├── perfil/                  # 🔵 SHELBY - Perfil do Utilizador
│   │   └── page.tsx
│   ├── carteira/                # 🟢 JOISSON - Carteira VAKS
│   │   ├── page.tsx
│   │   ├── carregar/
│   │   │   └── page.tsx
│   │   ├── converter/
│   │   │   └── page.tsx
│   │   └── transferir/
│   │       └── page.tsx
│   ├── vaquinhas/               # 🟢 JOISSON - Vaquinhas
│   │   ├── publicas/
│   │   │   └── page.tsx
│   │   ├── privadas/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── layout.tsx               # Layout raiz
│   ├── page.tsx                 # Home (pode redirecionar para landing ou dashboard)
│   ├── globals.css              # Estilos globais
│   └── providers.tsx            # Provedores (contextos, i18n, etc)
│
├── components/                  # Componentes React organizados por feature
│   ├── layout/                  # 🔵 SHELBY - Layout (Navbar, Footer, Sidebar)
│   │   ├── Navbar.tsx
│   │   └── index.ts
│   ├── auth/                    # 🔵 SHELBY - Componentes de Autenticação
│   │   └── index.ts             # LoginForm, RegisterForm, OAuthButton, 2FA...
│   ├── dashboard/               # 🔵 SHELBY - Componentes de Dashboard
│   │   └── index.ts             # VaquinhasOverview, SaldoTotal, NotificacoesDash...
│   ├── profile/                 # 🔵 SHELBY - Componentes de Perfil
│   │   └── index.ts             # AvatarUpload, DadosPessoais, SaldoInfo...
│   ├── vaquinhas/               # 🟢 JOISSON - Componentes de Vaquinhas
│   │   ├── VaquinhaCard.tsx
│   │   ├── VaquinhaDetalhe.tsx
│   │   ├── ContribuicaoForm.tsx
│   │   ├── HistoricoContribuicoes.tsx
│   │   ├── ProgressBar.tsx
│   │   └── index.ts
│   ├── carteira/                # 🟢 JOISSON - Componentes de Carteira
│   │   ├── HistoricoTransacoes.tsx
│   │   ├── TransferirVAKS.tsx
│   │   ├── ConversaoMoedas.tsx
│   │   └── index.ts
│   └── realtime/                # 🟢 JOISSON - Componentes Real-Time
│       ├── RealTimeNotification.tsx
│       └── index.ts
│
├── contexts/                    # Context API - Estado Global
│   ├── carteira/                # 🟢 JOISSON - Context da Carteira
│   │   ├── CarteiraContext.tsx
│   │   └── index.ts
│   ├── vaquinhas/               # 🟢 JOISSON - Context das Vaquinhas
│   │   ├── VaquinhasContext.tsx
│   │   └── index.ts
│   ├── auth/                    # 🔵 SHELBY - Context de Autenticação
│   │   └── index.ts             # AuthContext, UserContext...
│   ├── dashboard/               # 🔵 SHELBY - Context de Dashboard
│   │   └── index.ts             # NotificacoesContext, DashboardContext...
│   └── index.ts                 # Exporta todos os contextos
│
├── hooks/                       # Custom Hooks
│   ├── carteira/                # 🟢 JOISSON
│   │   ├── useCarteira.ts
│   │   └── index.ts
│   ├── vaquinhas/               # 🟢 JOISSON
│   │   ├── useVaquinhas.ts
│   │   ├── useVaquinhaDetalhe.ts
│   │   └── index.ts
│   ├── websocket/               # 🟢 JOISSON - Real-Time
│   │   ├── useWebSocket.ts
│   │   └── index.ts
│   ├── auth/                    # 🔵 SHELBY
│   │   └── index.ts             # useAuth, useLogin, use2FA...
│   └── index.ts                 # Exporta todos os hooks
│
├── utils/                       # Funções utilitárias
│   ├── api/                     # 🟢 JOISSON - Chamadas à API
│   │   ├── api.ts
│   │   └── index.ts
│   ├── currency/                # 🟢 JOISSON - Conversão de Moedas
│   │   ├── moedas.ts
│   │   └── index.ts
│   ├── formatting/              # 🟢 JOISSON - Formatação de Dados
│   │   ├── formatadores.ts
│   │   └── index.ts
│   ├── styling/                 # 🔵 SHELBY - Utilitários CSS/Tailwind
│   │   ├── cn.ts
│   │   └── index.ts
│   └── index.ts                 # Exporta todos os utilitários
│
├── locales/                     # Internacionalização (i18n)
│   ├── pt/                      # Português
│   │   └── index.ts
│   ├── en/                      # Inglês
│   │   └── index.ts
│   ├── useI18n.tsx              # Hook de i18n
│   └── index.ts
│
├── types/                       # Tipos TypeScript compartilhados
│   └── index.ts
│
├── public/                      # Assets estáticos
├── node_modules/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md (este arquivo)
```

---

## 👤 Responsabilidades por Pessoa

### 🔵 **PESSOA 1: Shelby**
#### Core & Auth + Dashboards + Landing Page

**Responsabilidades principais:**

1. **Autenticação (Auth)**
   - Login / Registo
   - OAuth (42 API)
   - JWT token handling
   - 2FA (Two-Factor Authentication)
   - Guardas de rota (rota protegida vs pública)
   - **Arquivos:** `app/auth/`, `components/auth/`, `hooks/auth/`, `contexts/auth/`

2. **Perfil do Utilizador**
   - Página de perfil
   - Atualização de dados pessoais
   - Upload de avatar / imagem
   - Visualização do saldo da carteira (integração com Joisson)
   - Histórico de transações (via API/WebSocket com Joisson)
   - **Arquivos:** `app/perfil/`, `components/profile/`

3. **Dashboard Principal**
   - Visão geral do progresso das vaquinhas
   - Saldo total VAKS (sincronizado com Joisson)
   - Notificações de novas contribuições
   - Listagem de campanhas (públicas + privadas)
   - Links para criar ou gerir vaquinhas
   - **Arquivos:** `app/dashboard/`, `components/dashboard/`, `contexts/dashboard/`

4. **Landing Page**
   - Página inicial (sem autenticação)
   - Apresentação do projeto
   - Call-to-action para login/registo
   - **Arquivos:** `app/(landing)/`

5. **Layout Base**
   - Navbar com links de navegação
   - Sidebar (opcional)
   - Footer
   - Sistema de notificações (alertas e toasts)
   - Responsividade (mobile + desktop)
   - Internacionalização (i18n) – textos traduzíveis
   - **Arquivos:** `components/layout/`, `utils/styling/`

---

### 🟢 **PESSOA 2: Joisson**
#### Vaquinhas & Real-Time + Carteira VAKS

**Responsabilidades principais:**

1. **Vaquinhas Públicas**
   - Página da campanha pública
   - Descrição, Meta, Progresso (barra de progresso)
   - Histórico de doações
   - Botão de contribuição (input + validação)
   - Lista de todas as vaquinhas públicas
   - Filtragem e pesquisa (opcional)
   - **Arquivos:** `app/vaquinhas/publicas/`, `components/vaquinhas/`

2. **Vaquinhas Privadas**
   - Página da campanha privada
   - Controlo de membros
   - Regras internas (mínimo por contribuição, data limite, objetivo oculto/visível)
   - Promoção de sudo
   - Gerir permissões dentro da vaquinha
   - Participação e contribuição com VAKS
   - **Arquivos:** `app/vaquinhas/privadas/`, `components/vaquinhas/`

3. **Carteira VAKS**
   - Visualização do saldo (sincronizado em real-time)
   - Transferência entre utilizadores (peer-to-peer)
   - Histórico de transações detalhado
   - Conversão simbólica (1 VAKS = 1€)
   - Carregar saldo
   - Converter VAKS
   - **Arquivos:** `app/carteira/`, `components/carteira/`, `contexts/carteira/`, `hooks/carteira/`, `utils/currency/`

4. **Real-Time & WebSockets**
   - Atualização em tempo real do progresso das campanhas
   - Notificação de novas contribuições
   - Sincronização do saldo da carteira
   - Tratamento de desconexões / reconexões
   - Broadcast de eventos para o frontend
   - **Arquivos:** `components/realtime/`, `hooks/websocket/`, `contexts/carteira/`, `contexts/vaquinhas/`

5. **API Integration**
   - Chamadas à API backend para vaquinhas
   - Chamadas à API backend para carteira
   - Formatação de dados
   - **Arquivos:** `utils/api/`, `utils/formatting/`

---

## 📦 Import Pattern

Para manter a organização, use imports organizados por pasta:

```typescript
// ✅ CORRETO - Importar do barrel file
import { useVaquinhas, useCarteira } from '@/hooks';
import { VaquinhaCard, ProgressBar } from '@/components';
import { CarteiraProvider } from '@/contexts';

// ❌ EVITAR - Importar direto do arquivo
import { useVaquinhas } from '@/hooks/vaquinhas/useVaquinhas';
```

---

## 🔄 Integração Entre Equipes

### Pontos de Integração:
1. **Saldo da Carteira no Perfil** - Shelby usa `useCarteira` hook de Joisson
2. **Notificações em Tempo Real** - Shelby usa `RealTimeNotification` de Joisson
3. **Dashboard com Resumo de Vaquinhas** - Shelby exibe dados de Joisson
4. **Autenticação Global** - Shelby setup auth, Joisson usa contexto de auth para proteger routes

### Workflow de Integração:
- Shelby setup Auth Context com user data
- Joisson consome Auth Context para verificar utilizador logado
- Joisson setup Carteira e Vaquinhas Contexts
- Shelby consome dados de Joisson via hooks/contexts para exibir no Dashboard e Perfil

---

## 🚀 Como Começar

### Setup Inicial
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Iniciar servidor de desenvolvimento
npm run dev
```

### Workflow de Desenvolvimento
1. **Criar feature branch** - `git checkout -b feature/sua-feature`
2. **Fazer commits** - `git commit -m "Descrição clara do que foi feito"`
3. **Push para repositório** - `git push origin feature/sua-feature`
4. **Criar Pull Request** - Descrever mudanças e fazer code review

---

## 📝 Notas Importantes

- ✅ Mantenha a estrutura de pastas organizada por funcionalidade
- ✅ Use barrel files (`index.ts`) para exportar componentes/hooks/contextos
- ✅ Documente mudanças no `CHANGELOG.md` (se existir)
- ✅ Faça testes dos componentes antes de fazer PR
- ✅ Comunique-se sobre mudanças no design de dados/API

---

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [React Context API](https://react.dev/reference/react/useContext)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Última atualização:** 19 de Fevereiro de 2026
