# Ambiente de Desenvolvimento — Containers Dev

> Documentação dos ficheiros `docker-compose.dev.yml`, `Dockerfile.dev` e `entrypoint.dev.sh`

---

## Índice

- [Visão Geral](#visão-geral)
- [Diferenças: Produção vs Desenvolvimento](#diferenças-produção-vs-desenvolvimento)
- [Arquitetura Dev](#arquitetura-dev)
- [Ficheiros por Serviço](#ficheiros-por-serviço)
- [Dockerfile.dev](#dockerfiledev)
- [entrypoint.dev.sh](#entrypointdevsh)
- [docker-compose.dev.yml](#docker-composedevyml)
- [Portas Expostas no Host](#portas-expostas-no-host)
- [Volumes (Bind Mounts)](#volumes-bind-mounts)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Prisma no Dev](#prisma-no-dev)
- [Comandos de Uso](#comandos-de-uso)
- [Troubleshooting](#troubleshooting)

---

## Visão Geral

O ambiente de desenvolvimento permite **trabalhar dentro dos containers** com:

- **Hot-reload** — `npm run start:dev` (NestJS `--watch`) detecta mudanças automaticamente
- **Código sincronizado** — bind mounts garantem que editar no VS Code reflete no container em tempo real
- **Infra completa** — PostgreSQL, Redis e todos os serviços disponíveis
- **Prisma automático** — `prisma generate` e `prisma migrate deploy` executam no boot do container
- **Portas expostas** — acesso direto a bancos e serviços pelo host (debug, Prisma Studio, pgAdmin, etc.)

---

## Diferenças: Produção vs Desenvolvimento

| Aspecto                    | `docker-compose.yml` (prod)                     | `docker-compose.dev.yml` (dev)                  |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| **Dockerfile**             | `Dockerfile` (multi-stage build)                 | `Dockerfile.dev` (single stage)                  |
| **Código fonte**           | Copiado para dentro da image (`COPY . .`)        | Montado via bind mount (`volumes:`)              |
| **Dependências**           | Só produção (`npm ci --omit=dev`)                | Todas (`npm ci`, incluindo devDeps)              |
| **Hot-reload**             | ❌ Não                                           | ✅ `npm run start:dev` (NestJS `--watch`)        |
| **Passwords**              | Docker Secrets (`/run/secrets/`)                 | Inline no environment (`DB_PASSWORD: change_me`) |
| **Redes**                  | Isoladas por domínio (`authnet`, `usernet`, ...) | Rede única (`devnet`)                            |
| **Portas dos bancos**      | ❌ Não expostas ao host                          | ✅ Expostas (5432–5436)                          |
| **Porta do Redis**         | ❌ Não exposta                                   | ✅ Exposta (6379)                                |
| **Utilizador no container**| `node` (não-root)                                | `root` (necessário para bind mounts)             |
| **Prisma migrations**      | `entrypoint.sh` lê secret para montar URL        | `entrypoint.dev.sh` usa envs inline              |
| **Entrypoint**             | `entrypoint.sh`                                  | `entrypoint.dev.sh`                              |

---

## Arquitetura Dev

```
┌──────────────────────────────── HOST ──────────────────────────────────┐
│                                                                        │
│  VS Code / Editor                                                      │
│    │  edita ficheiros em Backend/*/src/                                 │
│    │                                                                    │
│    ▼  (bind mount)                                                     │
│  ┌──────────────────────── devnet ───────────────────────────────┐     │
│  │                                                               │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │     │
│  │  │ api-gateway  │  │ auth-service │  │ campaign-service │    │     │
│  │  │ :3000        │  │ :3001        │  │ :3002            │    │     │
│  │  └─────────────┘  └──────┬───────┘  └────────┬─────────┘    │     │
│  │                           │                    │              │     │
│  │  ┌───────────────────┐  ┌┴──────────┐  ┌─────┴──────┐      │     │
│  │  │notification-svc   │  │ authDb     │  │ campaignDb │      │     │
│  │  │ :3003             │  │ :5432      │  │ :5433      │      │     │
│  │  └────────┬──────────┘  └───────────┘  └────────────┘      │     │
│  │           │                                                  │     │
│  │  ┌────────┴──────┐  ┌────────────┐  ┌────────────┐         │     │
│  │  │notificationDb │  │user-service│  │wallet-svc  │         │     │
│  │  │ :5434         │  │ :3004      │  │ :3005      │         │     │
│  │  └───────────────┘  └─────┬──────┘  └─────┬──────┘         │     │
│  │                           │                │                │     │
│  │                     ┌─────┴──────┐  ┌──────┴─────┐         │     │
│  │                     │  userDb    │  │  walletDb  │         │     │
│  │                     │  :5435     │  │  :5436     │         │     │
│  │                     └────────────┘  └────────────┘         │     │
│  │                                                             │     │
│  │                     ┌────────────┐                          │     │
│  │                     │   redis    │                          │     │
│  │                     │   :6379    │                          │     │
│  │                     └────────────┘                          │     │
│  └─────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

> Em dev, **todos os containers partilham a mesma rede `devnet`**. Não há isolamento por domínio — simplifica o debug e a comunicação cruzada durante o desenvolvimento.

---

## Ficheiros por Serviço

Cada serviço NestJS tem 3 ficheiros de desenvolvimento:

```
Backend/<service>/
├── Dockerfile          # Produção (multi-stage build)
├── Dockerfile.dev      # Desenvolvimento (single stage, hot-reload)
├── entrypoint.sh       # Produção (lê Docker Secrets)
└── entrypoint.dev.sh   # Desenvolvimento (usa env vars inline)
```

---

## Dockerfile.dev

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Instala TODAS as dependências (incluindo devDependencies)
COPY package*.json ./
RUN npm ci

# O código fonte NÃO é copiado — vem do bind mount.
# Apenas o entrypoint é copiado.
COPY entrypoint.dev.sh /usr/local/bin/entrypoint.dev.sh
RUN chmod +x /usr/local/bin/entrypoint.dev.sh

ENTRYPOINT ["entrypoint.dev.sh"]
CMD ["npm", "run", "start:dev"]
```

### Porquê single stage?

- Em dev não precisamos de imagem optimizada
- As devDependencies (TypeScript, Jest, ESLint, NestJS CLI) são necessárias para compilação e testes
- O `node_modules/` vive **dentro do container** (instalado no build), mas o `src/` vem do host via volume

### Quando é que a image precisa de rebuild?

| Mudança feita                      | Precisa de `--build`? |
| ---------------------------------- | --------------------- |
| Editou ficheiros em `src/`         | ❌ Não (bind mount)   |
| Editou `prisma/schema.prisma`      | ❌ Não (bind mount)   |
| Alterou `package.json` (nova dep)  | ✅ Sim                |
| Alterou `Dockerfile.dev`           | ✅ Sim                |
| Alterou `entrypoint.dev.sh`        | ✅ Sim                |

---

## entrypoint.dev.sh

```bash
#!/bin/sh
set -e

# 1. Monta DATABASE_URL a partir das env vars do compose
if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  echo "✔ DATABASE_URL built from environment variables"
fi

# 2. Se existir Prisma schema, gera o client e aplica migrations
if [ -f "prisma/schema.prisma" ]; then
  echo "⏳ Running prisma generate..."
  npx prisma generate
  echo "⏳ Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "✔ Prisma ready"
fi

# 3. Inicia a aplicação (CMD do Dockerfile ou override do compose)
echo "🚀 Starting: $@"
exec "$@"
```

### Fluxo de boot

```
Container inicia
    │
    ▼
entrypoint.dev.sh
    │
    ├─ DB_HOST + DB_PASSWORD existem?
    │   └─ Sim → export DATABASE_URL=postgresql://...
    │
    ├─ prisma/schema.prisma existe?
    │   ├─ Sim → npx prisma generate (gera o client)
    │   └─ Sim → npx prisma migrate deploy (aplica migrations)
    │
    └─ exec npm run start:dev (NestJS com hot-reload)
```

### Detecção automática de Prisma

O entrypoint verifica `if [ -f "prisma/schema.prisma" ]`. Isto significa que:

- **auth-service** (que já tem Prisma): executa generate + migrate
- **campaign-service, etc.** (que ainda não têm): pula directo para o start
- Quando adicionar Prisma a um serviço, basta criar o `prisma/` — sem alterar nada no entrypoint

---

## docker-compose.dev.yml

### Estrutura de cada serviço

```yaml
service-name:
  build:
    context: ./Backend/<service>     # Contexto de build
    dockerfile: Dockerfile.dev       # Usa a image de dev
  container_name: <service>-dev
  restart: unless-stopped
  ports:
    - "<host-port>:<container-port>" # Porta exposta para debug
  environment:
    NODE_ENV: development
    PORT: <port>
    DB_HOST: <dbContainer>           # Nome do container do banco
    DB_PORT: 5432
    DB_NAME: <database>
    DB_USER: <user>
    DB_PASSWORD: change_me           # Inline (sem Docker Secrets)
    REDIS_HOST: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: change_me
  volumes:
    - ./Backend/<service>/src:/app/src           # Código fonte
    - ./Backend/<service>/test:/app/test         # Testes
    - ./Backend/<service>/prisma:/app/prisma     # Schema + migrations
    - ./Backend/<service>/tsconfig.json:/app/tsconfig.json
    - ./Backend/<service>/tsconfig.build.json:/app/tsconfig.build.json
    - ./Backend/<service>/nest-cli.json:/app/nest-cli.json
  networks:
    - devnet
  depends_on:
    <dbContainer>:
      condition: service_healthy
    redis:
      condition: service_healthy
```

---

## Portas Expostas no Host

### Serviços de Aplicação

| Container              | Porta no Host | Acesso                          |
| ---------------------- | ------------- | ------------------------------- |
| `api-gateway-dev`      | `3000`        | `http://localhost:3000`         |
| `auth-service-dev`     | `3001`        | `http://localhost:3001`         |
| `campaign-service-dev` | `3002`        | `http://localhost:3002`         |
| `notification-svc-dev` | `3003`        | `http://localhost:3003`         |
| `user-service-dev`     | `3004`        | `http://localhost:3004`         |
| `wallet-service-dev`   | `3005`        | `http://localhost:3005`         |

### Bases de Dados

| Container             | Porta no Host | Connection String                                              |
| --------------------- | ------------- | -------------------------------------------------------------- |
| `authDb-dev`          | `5432`        | `postgresql://auth_user:change_me@localhost:5432/auth`         |
| `campaignDb-dev`      | `5433`        | `postgresql://campaign_user:change_me@localhost:5433/campaign` |
| `notificationDb-dev`  | `5434`        | `postgresql://notification_user:change_me@localhost:5434/notification` |
| `userDb-dev`          | `5435`        | `postgresql://user_user:change_me@localhost:5435/user_db`      |
| `walletDb-dev`        | `5436`        | `postgresql://wallet_user:change_me@localhost:5436/wallet`     |

### Cache

| Container    | Porta no Host | Acesso                                       |
| ------------ | ------------- | -------------------------------------------- |
| `redis-dev`  | `6379`        | `redis-cli -h localhost -p 6379 -a change_me`|

> As portas dos bancos estão expostas para que possas usar ferramentas como **pgAdmin**, **DBeaver**, **Prisma Studio** ou **TablePlus** directamente do host.

---

## Volumes (Bind Mounts)

Os bind mounts são a peça-chave que permite **editar no host e ver o resultado no container**.

### O que é montado (por serviço)

| Caminho no Host                        | Caminho no Container         | Propósito                      |
| -------------------------------------- | ---------------------------- | ------------------------------ |
| `./Backend/<svc>/src`                  | `/app/src`                   | Código fonte (hot-reload)      |
| `./Backend/<svc>/test`                 | `/app/test`                  | Ficheiros de teste             |
| `./Backend/<svc>/prisma`               | `/app/prisma`                | Schema + migrations do Prisma  |
| `./Backend/<svc>/tsconfig.json`        | `/app/tsconfig.json`         | Configuração TypeScript        |
| `./Backend/<svc>/tsconfig.build.json`  | `/app/tsconfig.build.json`   | Configuração de build          |
| `./Backend/<svc>/nest-cli.json`        | `/app/nest-cli.json`         | Configuração do NestJS CLI     |
| `./Backend/<svc>/prisma.config.ts`     | `/app/prisma.config.ts`      | Config do Prisma (auth apenas) |

### O que NÃO é montado (vive só no container)

| Caminho         | Razão                                                        |
| --------------- | ------------------------------------------------------------ |
| `/app/node_modules` | Instalado no build da image — evita conflitos host/container |
| `/app/dist`         | Gerado pelo NestJS watch — não precisa estar no host         |
| `/app/generated`    | Gerado pelo `prisma generate` no boot                        |

---

## Variáveis de Ambiente

### Por que inline em vez de Docker Secrets?

Em **desenvolvimento**, as passwords são simples (`change_me`) e não há risco de segurança. Passar inline no `environment:` do compose:

- Simplifica o setup (sem ficheiros de secret)
- Permite que o `entrypoint.dev.sh` construa a `DATABASE_URL` directamente
- Evita a complexidade de ler `/run/secrets/` em dev

### Variáveis comuns a todos os serviços com banco

| Variável       | Exemplo         | Descrição                           |
| -------------- | --------------- | ----------------------------------- |
| `NODE_ENV`     | `development`   | Modo da aplicação                   |
| `PORT`         | `3001`          | Porta do serviço                    |
| `DB_HOST`      | `authDb`        | Hostname do container PostgreSQL    |
| `DB_PORT`      | `5432`          | Porta interna do PostgreSQL         |
| `DB_NAME`      | `auth`          | Nome da base de dados               |
| `DB_USER`      | `auth_user`     | Utilizador do PostgreSQL            |
| `DB_PASSWORD`  | `change_me`     | Password do PostgreSQL              |
| `REDIS_HOST`   | `redis`         | Hostname do container Redis         |
| `REDIS_PORT`   | `6379`          | Porta do Redis                      |
| `REDIS_PASSWORD`| `change_me`    | Password do Redis                   |

### Variáveis geradas automaticamente pelo entrypoint

| Variável        | Valor gerado                                                     |
| --------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`  | `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public` |

---

## Prisma no Dev

### Fluxo automático (no boot do container)

```
Container auth-service-dev inicia
    │
    ├─ entrypoint.dev.sh monta DATABASE_URL
    ├─ npx prisma generate  →  gera client em ./generated/prisma
    ├─ npx prisma migrate deploy  →  aplica migrations pendentes no authDb
    │
    └─ npm run start:dev  →  NestJS com hot-reload
```

### Criar uma nova migration

```bash
# Entra no container
docker exec -it auth-service-dev sh

# Dentro do container:
npx prisma migrate dev --name add_new_field
```

A migration será criada em `prisma/migrations/` — que está montado via bind mount, então o ficheiro aparece no VS Code automaticamente.

### Abrir o Prisma Studio

```bash
docker exec -it auth-service-dev npx prisma studio
```

Ou, como o banco está exposto no host:

```bash
cd Backend/auth-service
DATABASE_URL="postgresql://auth_user:change_me@localhost:5432/auth?schema=public" npx prisma studio
```

---

## Comandos de Uso

### Subir tudo

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Subir apenas um serviço (e as suas dependências)

```bash
# Sobe auth-service + authDb + redis
docker compose -f docker-compose.dev.yml up --build auth-service
```

### Ver logs de um serviço

```bash
docker compose -f docker-compose.dev.yml logs -f auth-service
```

### Entrar num container

```bash
docker exec -it auth-service-dev sh
```

### Rodar testes dentro do container

```bash
docker exec -it auth-service-dev npm test
docker exec -it auth-service-dev npm run test:e2e
```

### Rebuild após alterar dependências

```bash
# Quando adicionas um pacote ao package.json:
docker compose -f docker-compose.dev.yml up --build auth-service
```

### Parar tudo

```bash
docker compose -f docker-compose.dev.yml down
```

### Parar e limpar volumes (reset total dos bancos)

```bash
docker compose -f docker-compose.dev.yml down -v
```

### Ver o estado dos containers

```bash
docker compose -f docker-compose.dev.yml ps
```

---

## Troubleshooting

### Container reinicia em loop

```bash
docker compose -f docker-compose.dev.yml logs auth-service
```

Causas comuns:
- **`prisma migrate deploy` falha**: schema com erros ou banco não está pronto
- **Porta já em uso**: outro processo ou container a usar a mesma porta
- **`node_modules` incompatível**: rebuild com `--build --no-cache`

### Hot-reload não funciona

- Verifica se o bind mount está correcto: `docker exec -it auth-service-dev ls /app/src`
- Em **Linux**, não deve haver problemas. Em **macOS/Windows**, pode haver atraso de ~2s nos fs events

### `prisma generate` falha no boot

- Confirma que `prisma/schema.prisma` existe e está correcto
- Confirma que `prisma` está nas `devDependencies` do `package.json`

### Não consigo conectar ao banco pelo host

- Confirma que o container do banco está healthy: `docker compose -f docker-compose.dev.yml ps`
- Confirma a porta correcta (cada banco tem porta diferente: 5432–5436)

### Erro de permissão nos bind mounts

```bash
# Se os ficheiros criados dentro do container ficam com owner root:
docker compose -f docker-compose.dev.yml down
sudo chown -R $USER:$USER Backend/
docker compose -f docker-compose.dev.yml up --build
```

---

*Documento gerado no âmbito do Épico #1 — Infraestrutura e Setup Inicial.*
