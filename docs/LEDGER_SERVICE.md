# Ledger Service — VAKS Token on Blockchain

## O que foi implementado

### Smart Contract — `VAKSToken.sol`
Token ERC-20 deployed na **Avalanche Fuji Testnet**. Gere toda a lógica on-chain de forma imutável e auditável.

**Endereço do contrato:** `0xc719E0b1488056FF848D5af73910C18b3A83a1e0`
**Explorer:** https://testnet.snowtrace.io/address/0xc719E0b1488056FF848D5af73910C18b3A83a1e0

Funções implementadas:
- `mint(address, amount, ref)` — cria tokens para um utilizador (só admin)
- `transfer(address, amount)` — transfere tokens entre endereços
- `burn(address, amount, ref)` — destrói tokens (só admin)
- `balanceOf(address)` — consulta saldo on-chain (grátis, sem gas)
- `transferAdmin(address)` — transfere o role de admin

Eventos on-chain (imutáveis, visíveis no Snowtrace):
- `Mint(to, amount, ref)` — emitido a cada mint
- `Transfer(from, to, amount)` — emitido a cada transferência
- `Burn(from, amount, ref)` — emitido a cada burn

### Ledger Service — NestJS (porta 3006)
Microserviço que faz a ponte entre a plataforma VAKS e a blockchain. Cada operação financeira é registada tanto na base de dados PostgreSQL (para queries rápidas) como on-chain (para auditabilidade e imutabilidade).

**Fluxo de uma operação:**
```
Wallet Service publica wallet.deposit → Redis Stream
       ↓
Ledger Service escuta o evento
       ↓
Cria LedgerEntry com status PENDING na DB
       ↓
Chama mint() no smart contract via ethers.js
       ↓
Aguarda confirmação on-chain
       ↓
Atualiza LedgerEntry para CONFIRMED com txHash + blockNumber
       ↓
Publica ledger.mint.confirmed → Redis Stream
```

**Endpoints disponíveis:**
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/ledger/mint` | Cria VAKS on-chain (admin) |
| POST | `/api/ledger/transfer` | Transfere VAKS on-chain |
| POST | `/api/ledger/wallet` | Regista wallet address do utilizador |
| GET | `/api/ledger/balance` | Saldo on-chain do utilizador autenticado |
| GET | `/api/ledger/balance/:address` | Saldo on-chain por endereço |
| GET | `/api/ledger/history` | Histórico de operações do utilizador |
| GET | `/api/ledger/tx/:hash` | Detalhes de uma transação |

---

## Estrutura de ficheiros

```
Backend/
├── ledger-contracts/          # Smart contract (Hardhat)
│   ├── contracts/
│   │   └── VAKSToken.sol      # O contrato Solidity
│   ├── scripts/
│   │   └── deploy.ts          # Script de deploy
│   ├── test/
│   │   └── VAKSToken.test.ts  # 14 testes
│   ├── hardhat.config.ts
│   └── .env                   # DEPLOYER_PRIVATE_KEY (nunca commitar)
│
└── ledger-service/            # NestJS microservice
    ├── src/
    │   ├── blockchain/
    │   │   ├── blockchain.service.ts  # Integração ethers.js
    │   │   └── abi.json               # ABI + endereço do contrato
    │   ├── ledger/
    │   │   ├── ledger.service.ts      # Lógica de negócio
    │   │   ├── ledger.controller.ts   # Endpoints REST
    │   │   └── dto/                   # Validação de inputs
    │   ├── events/
    │   │   └── event-consumer.service.ts  # Escuta Redis Streams
    │   ├── database/
    │   │   └── prisma.service.ts
    │   └── redis/
    │       └── redis.service.ts
    └── prisma/
        └── schema.prisma      # LedgerEntry + WalletMapping
```

---

## Setup inicial

### 1. Pré-requisitos
- Node.js 18+
- Docker Desktop a correr
- MetaMask com conta de desenvolvimento
- AVAX de testnet: https://core.app/tools/testnet-faucet

### 2. Instalar dependências

```powershell
# Contrato
cd ~/Documents/VAKS/Backend/ledger-contracts
npm install

# Serviço
cd ~/Documents/VAKS/Backend/ledger-service
npm install
```

### 3. Configurar variáveis de ambiente

**`ledger-contracts/.env`**
```env
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
DEPLOYER_PRIVATE_KEY=0xTUA_PRIVATE_KEY
SNOWTRACE_API_KEY=
```

**`ledger-service/.env`**
```env
DATABASE_URL=postgresql://ledger_user:change_me@localhost:5437/ledger
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_me
JWT_SECRET=change_me
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
VAKS_CONTRACT_ADDRESS=0xc719E0b1488056FF848D5af73910C18b3A83a1e0
ADMIN_PRIVATE_KEY=0xTUA_PRIVATE_KEY
PORT=3006
```

---

## Usar o serviço

### Subir a infraestrutura

```powershell
cd ~/Documents/VAKS

# Subir só o necessário para o ledger-service
docker compose -f docker-compose.dev.yml up -d ledgerDb redis

# Ou subir tudo
docker compose -f docker-compose.dev.yml up -d
```

### Arrancar o serviço

```powershell
cd ~/Documents/VAKS/Backend/ledger-service
npm run start:dev
```

### Verificar que está a correr

```powershell
Invoke-RestMethod http://localhost:3006/health
# → { status: "ok", service: "ledger-service" }
```

### Swagger (interface visual de todos os endpoints)

```powershell
Start-Process "http://localhost:3006/api/docs"
```

---

## Testar os endpoints

### Gerar um JWT de teste

```powershell
cd ~/Documents/VAKS/Backend/ledger-service
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({sub:'user-1',email:'test@vaks.com'},'change_me',{expiresIn:'1h'}))"
```

Copia o token gerado para usar nos próximos comandos.

### Registar uma wallet address

```powershell
$token = "COLA_O_TOKEN_AQUI"

Invoke-RestMethod -Uri "http://localhost:3006/api/ledger/wallet" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"walletAddress":"0x979295b024D13DeB62f73f82Da50168F3CcB0cc7"}'
```

### Fazer mint de VAKS on-chain

```powershell
Invoke-RestMethod -Uri "http://localhost:3006/api/ledger/mint" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"userId":"user-1","walletAddress":"0x979295b024D13DeB62f73f82Da50168F3CcB0cc7","amount":100,"ref":"test-mint"}'

# Resposta esperada:
# { id, userId, walletAddr, txHash: "0x...", amount: 100, operation: "MINT", status: "CONFIRMED", blockNumber: ... }
```

### Consultar saldo on-chain

```powershell
# Por endereço (sem auth)
Invoke-RestMethod "http://localhost:3006/api/ledger/balance/0x979295b024D13DeB62f73f82Da50168F3CcB0cc7"

# Do utilizador autenticado
Invoke-RestMethod -Uri "http://localhost:3006/api/ledger/balance" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Ver histórico de operações

```powershell
Invoke-RestMethod -Uri "http://localhost:3006/api/ledger/history?page=1&limit=10" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Ver detalhes de uma transação

```powershell
$txHash = "0x_HASH_DA_TRANSACAO"
Invoke-RestMethod -Uri "http://localhost:3006/api/ledger/tx/$txHash" `
  -Headers @{ Authorization = "Bearer $token" }
```

---

## Testar o smart contract

### Correr todos os testes

```powershell
cd ~/Documents/VAKS/Backend/ledger-contracts
npx hardhat test
```

### Correr testes com relatório de gas

```powershell
$env:REPORT_GAS="true"; npx hardhat test
```

### Testar numa rede local (sem gastar AVAX real)

```powershell
# Terminal 1 — inicia rede local
npx hardhat node

# Terminal 2 — deploy local
npx hardhat run scripts/deploy.ts --network hardhat
```

### Interagir com o contrato via console

```powershell
npx hardhat console --network fuji
```

```javascript
// No console do Hardhat
const [signer] = await ethers.getSigners()
const token = await ethers.getContractAt("VAKSToken", "0xc719E0b1488056FF848D5af73910C18b3A83a1e0")

// Consultar saldo
const balance = await token.balanceOf("0x979295b024D13DeB62f73f82Da50168F3CcB0cc7")
ethers.formatUnits(balance, 18)

// Consultar total supply
const supply = await token.totalSupply()
ethers.formatUnits(supply, 18)

// Ver admin
await token.admin()
```

---

## Debug

### Ver logs do serviço em tempo real

```powershell
cd ~/Documents/VAKS/Backend/ledger-service
npm run start:dev
# Os logs aparecem no terminal com timestamp e nível (LOG, ERROR, WARN)
```

### Ver logs do container em produção

```powershell
docker logs ledger-service-dev -f --tail 50
```

### Verificar DB diretamente

```powershell
# Conectar à DB
docker exec -it ledgerDb-dev psql -U ledger_user -d ledger

# Ver todas as entradas
SELECT id, "userId", operation, status, amount, "txHash", "createdAt" FROM "LedgerEntry" ORDER BY "createdAt" DESC LIMIT 20;

# Ver wallet mappings
SELECT * FROM "WalletMapping";

# Contar por status
SELECT status, COUNT(*) FROM "LedgerEntry" GROUP BY status;
```

### Verificar Redis Streams

```powershell
docker exec -it redis-dev redis-cli -a change_me

# Ver mensagens no stream do ledger
XRANGE ledger-events - + COUNT 10

# Ver mensagens do wallet-service (que o ledger escuta)
XRANGE wallet-events - + COUNT 10

# Ver consumer groups
XINFO GROUPS wallet-events
```

### Verificar transação no Snowtrace

Qualquer `txHash` retornado pode ser consultado em:
```
https://testnet.snowtrace.io/tx/<TX_HASH>
```

### Problemas comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `ECONNREFUSED 6379` | Redis não está a correr | `docker compose up -d redis` |
| `ECONNREFUSED 5437` | DB não está a correr | `docker compose up -d ledgerDb` |
| `Invalid URL` | `DATABASE_URL` em falta no `.env` | Verificar `.env` |
| `Cannot find module abi.json` | Deploy não foi feito | `npx hardhat run scripts/deploy.ts --network fuji` |
| `insufficient funds` | Sem AVAX para gas | Faucet: https://core.app/tools/testnet-faucet |
| `OnlyAdmin` no contrato | A wallet não é o admin | Usar a mesma `ADMIN_PRIVATE_KEY` que fez o deploy |

---

## Re-deploy do contrato (se necessário)

Se precisares de fazer um novo deploy (ex: mudaste o contrato):

```powershell
cd ~/Documents/VAKS/Backend/ledger-contracts

# Deploy na Fuji
npx hardhat run scripts/deploy.ts --network fuji

# O novo endereço é guardado automaticamente em:
# ledger-service/src/blockchain/abi.json

# Atualiza também o .env do ledger-service:
# VAKS_CONTRACT_ADDRESS=0x_NOVO_ENDERECO
```

---

## Adicionar o token VAKS ao MetaMask

1. MetaMask → **Import tokens**
2. **Token contract address:** `0xc719E0b1488056FF848D5af73910C18b3A83a1e0`
3. **Symbol:** `VAKS`
4. **Decimals:** `18`
5. **Add token**

Depois de um mint, o saldo VAKS aparece diretamente no MetaMask.

---

*Ledger Service — VAKS Platform | Avalanche Fuji Testnet*
