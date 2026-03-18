# VAKS Platform

Plataforma de vaquinhas digitais com tokens on-chain na rede Avalanche. Permite criar grupos de poupança colaborativos — públicos ou privados — com rastreabilidade financeira garantida por smart contracts.

---

## Estrutura do repositório

```
vaks-platform/
├── apps/
│   ├── frontend/          # Aplicação web (React / Next.js)
│   └── backend/           # Microserviços NestJS
├── docs/                  # Documentação técnica e de produto
└── README.md
```

> Cada pasta em `apps/` corresponde a um repositório Git independente, incorporado aqui via `git subtree`. O histórico de commits de cada projeto está preservado.

---

## O que é o VAKS?

**VAKS** é uma plataforma que permite a grupos de pessoas criarem vaquinhas digitais com as seguintes garantias:

- Cada contribuição é registada on-chain, de forma imutável e auditável
- O saldo de cada vaquinha é verificável publicamente no block explorer
- Tokens VAKS são emitidos e destruídos por smart contract, sem intervenção manual possível
- Vaquinhas podem ser públicas (abertas a qualquer utilizador) ou privadas (por convite)

---

## Stack tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | React / Next.js |
| Backend | NestJS (Node.js) |
| Base de dados | PostgreSQL via Prisma ORM |
| Mensageria | Redis Streams |
| Blockchain | Avalanche C-Chain (Fuji Testnet) |
| Smart contract | Solidity — padrão ERC-20 |
| Interação on-chain | ethers.js |
| Testes de contrato | Hardhat |
| Infraestrutura local | Docker Compose |

---

## Pré-requisitos

- Node.js 18+
- Docker Desktop
- MetaMask com uma conta de desenvolvimento
- AVAX de testnet — obtém em [core.app/tools/testnet-faucet](https://core.app/tools/testnet-faucet)

---

## Início rápido

### 1. Clonar o repositório

```bash
git clone https://github.com/teu-user/vaks-platform.git
cd vaks-platform
```

### 2. Subir a infraestrutura local

```bash
docker compose -f apps/backend/docker-compose.dev.yml up -d
```

Isto inicia o PostgreSQL (porta 5437) e o Redis (porta 6379).

### 3. Configurar variáveis de ambiente

Copia os ficheiros de exemplo em cada serviço:

```bash
cp apps/backend/ledger-service/.env.example apps/backend/ledger-service/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Preenche os valores indicados — em particular `ADMIN_PRIVATE_KEY` e `DATABASE_URL`.

### 4. Instalar dependências e arrancar

```bash
# Backend — Ledger Service
cd apps/backend/ledger-service
npm install && npm run start:dev

# Frontend (noutra janela)
cd apps/frontend
npm install && npm run dev
```

A API fica disponível em `http://localhost:3006` e o frontend em `http://localhost:3000`.

---

## Smart contract

O token VAKS está deployado na Avalanche Fuji Testnet:

```
Endereço:  0xc719E0b1488056FF848D5af73910C18b3A83a1e0
Explorer:  https://testnet.snowtrace.io/address/0xc719E0b1488056FF848D5af73910C18b3A83a1e0
Símbolo:   VAKS
Decimais:  18
```

Para fazer re-deploy após alterações ao contrato:

```bash
cd apps/backend/ledger-contracts
npm install
npx hardhat run scripts/deploy.ts --network fuji
```

---

## Documentação

| Documento | Localização |
|---|---|
| Ledger Service — setup e endpoints | `apps/backend/ledger-service/README.md` |
| Smart contract — funções e eventos | `apps/backend/ledger-contracts/README.md` |
| Frontend — estrutura e rotas | `apps/frontend/README.md` |
| Arquitectura geral | `docs/architecture.md` |

---

## Repositórios de origem

Este monorepo agrega os seguintes repositórios via `git subtree`:

| Projeto | Repositório original | Prefix no monorepo |
|---|---|---|
| Frontend | `github.com/teu-user/vaks-frontend` | `apps/frontend` |
| Backend | `github.com/teu-user/vaks-backend` | `apps/backend` |

Para sincronizar alterações de um repo original:

```bash
git subtree pull --prefix=apps/frontend frontend-origin main --squash
git subtree pull --prefix=apps/backend backend-origin main --squash
```

---

## Contribuir

1. Cria um branch a partir de `main`: `git checkout -b feat/nome-da-feature`
2. Faz as alterações na pasta do projeto relevante (`apps/frontend` ou `apps/backend`)
3. Abre um Pull Request com descrição clara do que foi alterado e porquê

---

## Licença

Projecto académico — Projecto Final Common Core.
