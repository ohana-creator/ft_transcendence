# Documentação Técnica — Infraestrutura VAKS

> Épico #1: Infraestrutura e Setup Inicial

---

## Índice

- [Visão Geral](#visão-geral)
- [Arquitetura de Containers](#arquitetura-de-containers)
- [Redes Docker](#redes-docker)
- [Fluxo de Comunicação](#fluxo-de-comunicação)
- [Bases de Dados](#bases-de-dados)
- [Redis](#redis)
- [Secrets e Segurança](#secrets-e-segurança)
- [Build Pipeline (Dockerfile)](#build-pipeline-dockerfile)
- [Health Checks](#health-checks)
- [Diagrama de Rede](#diagrama-de-rede)

---

## Visão Geral

O projeto VAKS segue uma **arquitetura de microserviços** com:

- **6 serviços NestJS** (Fastify) — cada um com responsabilidade isolada
- **5 bases de dados PostgreSQL** — uma por domínio, sem acesso cruzado
- **1 instância Redis** — cache e comunicação entre serviços
- **1 API Gateway** — ponto de entrada único para o mundo exterior

Toda a orquestração é feita via `docker-compose.yml` na raiz do projeto.

---

## Arquitetura de Containers

### Serviços de Aplicação

| Container                | Framework      | Porta | Papel                                        |
| ------------------------ | -------------- | ----- | -------------------------------------------- |
| `api-gateway`          | NestJS/Fastify | 3000  | Gateway HTTP. Encaminha para microserviços. |
| `auth-service`         | NestJS/Fastify | 3001  | Autenticação, JWT, login, registo.         |
| `campaign-service`     | NestJS/Fastify | 3002  | Gestão de campanhas e eventos.              |
| `notification-service` | NestJS/Fastify | 3003  | Envio de notificações assíncronas.        |
| `user-service`         | NestJS/Fastify | 3004  | CRUD de perfis de utilizador.                |
| `wallet-service`       | NestJS/Fastify | 3005  | Carteira virtual, saldo e transações.      |

Todos os serviços:

- Usam **Node.js 20 Alpine** (multi-stage build)
- Escutam em `0.0.0.0` na porta definida por `process.env.PORT`
- Correm como utilizador `node` (não root)
- Expõem um endpoint `GET /health` que devolve `{ status, service, timestamp }`

### Bases de Dados

| Container          | Imagem          | Base de Dados    | Utilizador            |
| ------------------ | --------------- | ---------------- | --------------------- |
| `authDb`         | `postgres:16` | `auth`         | `auth_user`         |
| `campaignDb`     | `postgres:16` | `campaign`     | `campaign_user`     |
| `notificationDb` | `postgres:16` | `notification` | `notification_user` |
| `userDb`         | `postgres:16` | `users`        | `user_user`         |
| `walletDb`       | `postgres:16` | `wallet`       | `wallet_user`       |

Cada base de dados:

- Tem **volume Docker nomeado** para persistência (`auth_data`, `campaign_data`, etc.)
- Usa password via **Docker Secret** (`POSTGRES_PASSWORD_FILE`)
- Tem **healthcheck** com `pg_isready` (interval: 10s, timeout: 5s, retries: 5)
- **Não expõe porta ao host** — acessível apenas pela rede interna do respectivo serviço

### Cache

| Container | Imagem             | Porta interna |
| --------- | ------------------ | ------------- |
| `redis` | `redis:7-alpine` | 6379          |

- Protegido por password via Docker Secret
- Healthcheck com `redis-cli ping`
- **Não expõe porta ao host** — acessível apenas via `TransNetwork`

---

## Redes Docker

O projeto usa **redes bridge isoladas** para segmentar a comunicação:

| Rede                | Containers ligados                                                                                     | Propósito                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `TransNetwork`    | api-gateway, auth-service, campaign-service, notification-service, user-service, wallet-service, redis | Rede principal de comunicação entre serviços e gateway |
| `authnet`         | auth-service, authDb                                                                                   | Isola o acesso ao banco de autenticação                 |
| `campaignnet`     | campaign-service, campaignDb                                                                           | Isola o acesso ao banco de campanhas                      |
| `notificationnet` | notification-service, notificationDb                                                                   | Isola o acesso ao banco de notificações                 |
| `usernet`         | user-service, userDb                                                                                   | Isola o acesso ao banco de utilizadores                   |
| `walletnet`       | wallet-service, walletDb                                                                               | Isola o acesso ao banco de carteiras                      |

### Princípio de Isolamento

```
                         ┌────────────────────────────────────────────────┐
                         │              TransNetwork                      │
 Host :3000 ────────────▶│  api-gateway ◄──► auth-service                │
                         │               ◄──► user-service               │
                         │               ◄──► wallet-service             │
                         │               ◄──► campaign-service           │
                         │               ◄──► notification-service       │
                         │               ◄──► redis                      │
                         └────────────────────────────────────────────────┘

      authnet                usernet              walletnet
  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
  │ auth-service │      │ user-service │     │wallet-service│
  │   authDb     │      │   userDb     │     │  walletDb    │
  └──────────────┘      └──────────────┘     └──────────────┘

      campaignnet           notificationnet
  ┌──────────────┐      ┌──────────────────┐
  │campaign-svc  │      │notification-svc  │
  │ campaignDb   │      │ notificationDb   │
  └──────────────┘      └──────────────────┘
```

**Resultado**: nenhum serviço consegue aceder à base de dados de outro serviço diretamente. Toda a comunicação entre domínios passa obrigatoriamente pela `TransNetwork` via HTTP ou eventos com o Redis Streams.

---

## Fluxo de Comunicação

### Request do Cliente

```
Cliente HTTP
    │
    ▼
┌─────────────┐     HTTP (TransNetwork)     ┌────────────────┐
│ api-gateway │ ──────────────────────────▶  │ auth-service   │
│  :3000      │ ──────────────────────────▶  │ user-service   │
│             │ ──────────────────────────▶  │ wallet-service │
│             │ ──────────────────────────▶  │ campaign-svc   │
│             │ ──────────────────────────▶  │ notification   │
└─────────────┘                              └────────────────┘
                                                    │
                                                    ▼
                                              ┌──────────┐
                                              │ Redis    │
                                              │ (cache)  │
                                              └──────────┘
```

### Como o Gateway descobre os serviços

As URLs dos serviços são injectadas via environment variables:

```
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3004
WALLET_SERVICE_URL=http://wallet-service:3005
CAMPAIGN_SERVICE_URL=http://campaign-service:3002
NOTIFICATION_SERVICE_URL=http://notification-service:3003
```

O Docker Compose resolve os nomes dos containers automaticamente pela rede `TransNetwork`.

### Comunicação com o Redis

Todos os serviços que precisam de cache/Streams comunicam com o Redis via `TransNetwork`:

```
REDIS_HOST=redis
REDIS_PORT=6379
```

A password do Redis é lida do Docker Secret montado em `/run/secrets/redis_password`.

---

## Bases de Dados

### Isolamento por Domínio

Cada microserviço tem a sua base de dados PostgreSQL dedicada. Este padrão ("database-per-service") garante:

1. **Autonomia** — cada equipa pode evoluir o schema independentemente
2. **Segurança** — um serviço comprometido não acede a dados de outro domínio
3. **Escalabilidade** — cada base pode ser tunada/escalada separadamente

### Ligação Serviço → BD

Os serviços recebem os dados de ligação via environment variables:

| Variável   | Exemplo (auth) | Descrição                 |
| ----------- | -------------- | --------------------------- |
| `DB_HOST` | `authDb`     | Container name na rede      |
| `DB_PORT` | `5432`       | Porta padrão do PostgreSQL |
| `DB_NAME` | `auth`       | Nome da base de dados       |
| `DB_USER` | `auth_user`  | Utilizador do PostgreSQL    |

A password **nunca** é passada como env var — é lida do Docker Secret montado em `/run/secrets/<service>_db_password`.

### Persistência

Cada base usa um **volume Docker nomeado**:

| Volume                | Container          |
| --------------------- | ------------------ |
| `auth_data`         | `authDb`         |
| `campaign_data`     | `campaignDb`     |
| `notification_data` | `notificationDb` |
| `user_data`         | `userDb`         |
| `wallet_data`       | `walletDb`       |

Os volumes sobrevivem a `docker compose down`. Para resetar completamente, usar `docker compose down -v`.

---

## Redis

- **Imagem**: `redis:7-alpine`
- **Propósito**: cache de sessões, Streams entre serviços, rate limiting
- **Segurança**: protegido por password via Docker Secret
- **Healthcheck**: `redis-cli ping` (interval: 10s)
- **Persistência**: sem volume dedicado (cache volátil por design)

O Redis é acessível apenas pela `TransNetwork`. Nenhuma porta é exposta ao host.

O `api-gateway` e todos os microserviços recebem `REDIS_HOST`, `REDIS_PORT` e o secret `redis_password`.

---

## Secrets e Segurança

### Docker Secrets

Em vez de colocar passwords no `.env`, o projeto usa [Docker Secrets](https://docs.docker.com/compose/how-tos/use-secrets/):

```yaml
secrets:
  auth_db_password:
    file: ./secrets/auth_db_password.txt
```

Dentro do container, o secret fica disponível em `/run/secrets/auth_db_password` como ficheiro read-only.

O PostgreSQL lê a password via `POSTGRES_PASSWORD_FILE` (suporte nativo da imagem oficial).

### Boas Práticas Implementadas

| Prática                                         | Estado |
| ------------------------------------------------ | ------ |
| Passwords fora do `.env`                       | ✅     |
| `.gitignore` impede commit de secrets          | ✅     |
| Containers correm como user `node` (não root) | ✅     |
| BDs não expostas ao host                        | ✅     |
| Redis não exposto ao host                       | ✅     |
| Redes isoladas por domínio                      | ✅     |

---

## Build Pipeline (Dockerfile)

Todos os serviços usam um **multi-stage build** idêntico:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/main"]
```

**Benefícios**:

- Imagem final leve (só deps de produção + `dist/`)
- Sem código-fonte ou devDependencies na imagem final
- Execução como utilizador não-root (`USER node`)
- Cache de layers Docker eficiente (`package*.json` copiado antes do resto)

---

## Health Checks

### Nível de Aplicação (NestJS)

Cada serviço expõe `GET /health`:

```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2026-02-22T12:00:00.000Z"
}
```

Implementado via `HealthController` + `HealthService` em cada serviço.

### Nível de Docker (healthcheck)

| Container          | Mecanismo                        | Intervalo | Timeout | Retries |
| ------------------ | -------------------------------- | --------- | ------- | ------- |
| `authDb`         | `pg_isready -U <user> -d <db>` | 10s       | 5s      | 5       |
| `campaignDb`     | `pg_isready -U <user> -d <db>` | 10s       | 5s      | 5       |
| `notificationDb` | `pg_isready -U <user> -d <db>` | 10s       | 5s      | 5       |
| `userDb`         | `pg_isready -U <user> -d <db>` | 10s       | 5s      | 5       |
| `walletDb`       | `pg_isready -U <user> -d <db>` | 10s       | 5s      | 5       |
| `redis`          | `redis-cli ping`               | 10s       | 5s      | 5       |

### Dependências de Startup

Os serviços NestJS usam `depends_on` com `condition: service_healthy`, garantindo que só iniciam depois das suas bases de dados estarem prontas:

```
auth-service    → depends_on authDb (healthy)
campaign-service → depends_on campaignDb (healthy)
notification-service → depends_on notificationDb (healthy)
user-service    → depends_on userDb (healthy)
wallet-service  → depends_on walletDb (healthy)
api-gateway     → depends_on redis (healthy)
```

---

## Diagrama de Rede

```
                    ┌─────────── HOST ───────────┐
                    │                             │
                    │           :3000             │
                    └──┬───────┬──────┬───────┬───┘
                       │       │      │       │
          ┌────────────┴───────┴──────┴───────┴─────────────┐
          │                 TransNetwork                      │
          │                                                   │
          │  ┌─────────────┐    ┌──────────────┐             │
          │  │ api-gateway │    │    redis      │             │
          │  │   :3000     │    │   :6379       │             │
          │  └─────────────┘    └──────────────┘             │
          │                                                   │
          │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
          │  │auth :3001│ │user :3004│ │wallet     :3005  │  │
          │  └────┬─────┘ └────┬─────┘ └────┬─────────────┘  │
          │       │            │             │                │
          │  ┌────┼─────┐ ┌────┼─────┐ ┌────┼─────┐         │
          │  │campaign   │ │notific.  │ │         │         │
          │  │  :3002    │ │  :3003   │ │         │         │
          │  └────┬──────┘ └────┬─────┘ │         │         │
          └───────┼─────────────┼───────┼─────────┼─────────┘
                  │             │       │         │
          ┌───────┴──┐   ┌─────┴───┐ ┌─┴──────┐ ┌┴─────────┐
          │authnet   │   │usernet  │ │walletnet│ │campaignnet│
          │ authDb   │   │ userDb  │ │walletDb │ │campaignDb │
          └──────────┘   └────────┘  └────────┘  └──────────┘
                              ┌────────────────┐
                              │notificationnet │
                              │notificationDb  │
                              └────────────────┘
```

---

*Documento gerado no âmbito do Épico #1 — Infraestrutura e Setup Inicial.*
