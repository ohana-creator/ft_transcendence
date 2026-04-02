# VAKS Frontend - React + Next.js

Frontend da plataforma VAKS para gerenciamento de vaquinhas virtuais e carteira virtual.

## 👥 Divisão de Responsabilidades

Este projeto é desenvolvido por **2 pessoas**:

- **🔵 Shelby** - Core & Auth + Dashboards + Landing Page
- **🟢 Joisson** - Vaquinhas & Real-Time + Carteira VAKS

📖 **Para detalhes completos sobre estrutura e responsabilidades, veja [TEAM_STRUCTURE.md](./TEAM_STRUCTURE.md)**

## 🎨 Design

O design utiliza a paleta de cores VAKS:
- **True Cobalt** (#203085) - Cor primária
- **French Blue** (#314580) - Cor secundária
- **Charcoal Blue** (#4A5468) - Textos secundários
- **Platinum** (#F5F7FA) - Background
- **Ink Black** (#0A0E1A) - Textos principais

## 🚀 Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones
- **WebSocket** - Atualizações em tempo real

## 📁 Estrutura do Projeto

Veja [TEAM_STRUCTURE.md](./TEAM_STRUCTURE.md) para a estrutura completa.

Resumo:

```
vaks-frontend/
├── app/                    # Páginas Next.js (App Router)
│   ├── carteira/          # Página da carteira
│   ├── vaquinhas/
│   │   ├── [id]/          # Detalhe da vaquinha
│   │   ├── publicas/      # Vaquinhas públicas
│   │   └── privadas/      # Vaquinhas privadas
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página inicial
├── components/            # Componentes reutilizáveis
│   ├── VaquinhaCard.tsx
│   ├── VaquinhaDetalhe.tsx
│   ├── ContribuicaoForm.tsx
│   ├── HistoricoContribuicoes.tsx
│   ├── HistoricoTransacoes.tsx
│   ├── TransferirVAKS.tsx
│   ├── ProgressBar.tsx
│   └── RealTimeNotification.tsx
├── contexts/              # Context API para estado global
│   ├── VaquinhasContext.tsx
│   └── CarteiraContext.tsx
├── hooks/                 # Custom hooks
│   ├── useVaquinhas.ts
│   ├── useVaquinhaDetalhe.ts
│   ├── useCarteira.ts
│   └── useWebSocket.ts
├── locales/              # Internacionalização
│   ├── pt.ts
│   ├── en.ts
│   └── useI18n.tsx
├── types/                # Tipos TypeScript
│   └── index.ts
└── utils/                # Utilitários
    ├── cn.ts
    └── formatadores.ts
```

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <repo-url>
cd vaks-frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📄 Páginas Implementadas

### `/vaquinhas/publicas`
Lista todas as vaquinhas públicas com:
- Filtros por categoria
- Busca por nome
- Ordenação (recentes, populares, próximas da meta)

### `/vaquinhas/[id]`
Detalhe individual da vaquinha com:
- Informações completas
- Barra de progresso
- Formulário de contribuição
- Histórico de contribuições em tempo real

### `/vaquinhas/privadas`
Lista de vaquinhas privadas do usuário autenticado

### `/carteira`
Carteira VAKS com:
- Saldo disponível e pendente
- Histórico de transações
- Transferências peer-to-peer

## 🎯 Funcionalidades

-  Listagem de vaquinhas públicas e privadas
-  Detalhe completo de vaquinhas
-  Formulário de contribuição
-  Carteira virtual com histórico
-  Transferências P2P
-  Notificações em tempo real via WebSocket
-  Suporte a internacionalização (PT/EN)
-  Design responsivo

## 🔄 Próximos Passos

### Backend Integration
- [ ] Integrar com API REST do backend
- [ ] Implementar autenticação JWT
- [ ] Conectar WebSocket para notificações real-time

### Funcionalidades Adicionais
- [ ] Criar página de criação de vaquinhas
- [ ] Implementar upload de imagens
- [ ] Adicionar sistema de categorias
- [ ] Implementar busca avançada
- [ ] Adicionar dashboard do usuário
- [ ] Sistema de notificações persistente

### Melhorias de UX
- [ ] Loading skeletons
- [ ] Animações de transição
- [ ] Toast notifications
- [ ] Confirmação de ações críticas
- [ ] Modo escuro

## 🧪 Testes

```bash
# Rodar testes (quando implementados)
npm test

# Rodar testes em modo watch
npm run test:watch
```

## 📦 Build

```bash
# Build de produção
npm run build

# Rodar build de produção
npm start
```

## 🐳 Docker

O frontend já pode ser executado em container de produção.

```bash
# Build da imagem local
docker build -t vaks-frontend .

# Subir o frontend junto com o backend existente
cd ../backend
docker compose up --build frontend
```

Depois disso, o frontend fica disponível em `http://localhost:3001`.

### Desenvolvimento com hot reload

```bash
docker compose -f docker-compose.dev.yml up --build
```

Este modo monta o código da pasta atual, mantém `node_modules` no volume do container e liga o frontend ao backend que estiver exposto no host em `http://localhost:3000`.

## 🤝 Contribuindo

Este é o frontend do projeto VAKS (Pessoa 2). Para contribuir:

1. Crie uma branch para sua feature
2. Commit suas mudanças
3. Push para a branch
4. Abra um Pull Request

## 📝 Notas de Implementação

### Componentes
Todos os componentes estão prontos para receber props e estado do backend. Os TODOs indicam onde implementar as chamadas à API.

### Hooks
Os hooks customizados têm mock data para desenvolvimento. Substitua pelos endpoints reais da API.

### WebSocket
A conexão WebSocket está configurada mas precisa da URL do servidor. Configure em `.env.local`.

### Contextos
VaquinhasContext e CarteiraContext gerenciam estado global e podem ser integrados com React Query ou SWR para cache.

## 📄 Licença

[Adicionar licença]

## 👥 Time

Pessoa 2 - Frontend Developer

