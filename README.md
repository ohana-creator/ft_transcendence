# VAKS — ft_transcendence

Projeto final do common core da 42: plataforma web baseada em microserviços com NestJS, PostgreSQL, Redis e Docker.

---

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Quick Start](#quick-start)
- [Verificação](#verificação)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Serviços e Portas](#serviços-e-portas)
- [Environment Variables](#environment-variables)
- [Secrets](#secrets)
- [Comandos Úteis](#comandos-úteis)
- [Documentação Adicional](#documentação-adicional)

---

## Pré-requisitos

| Ferramenta     | Versão mínima |
| -------------- | --------------- |
| Docker         | 24.x            |
| Docker Compose | 2.20+           |
| Git            | 2.x             |

> Não é necessário ter Node.js instalado localmente — o build é feito dentro dos containers.

---

## Quick Start

```bash
# 1. Clonar o repositório
git clone git@github.com:ShelbyEbo/ft_transcendence.git
cd ft_transcendence

# 2. Criar o ficheiro .env a partir do exemplo
cp .env.example .env

# 3. Gerar os secrets (passwords e JWT)
for f in auth_db_password campaign_db_password notification_db_password \
         user_db_password wallet_db_password redis_password jwt_secret; do
  openssl rand -base64 32 | tr -d '\n' > "secrets/${f}.txt"
done

# 4. Subir todo o ecossistema
docker compose up -d

# 5. Verificar que tudo está running
docker compose ps
```

---

## Verificação

Após `docker compose up -d`, todos os containers devem ficar com status **running**.

Testar os health checks:

```bash
# API Gateway (porta padrão: 3000)
curl http://localhost:3000/health

# Other Services (porta padrão: 3001)
curl http://localhost:3000/service/health
```

Cada endpoint devolve:

```json
{
  "status": "ok",
  "service": "<nome-do-serviço>",
  "timestamp": "2026-02-22T12:00:00.000Z"
}
```

---

## Estrutura do Projeto

```
ft_transcendence/
├── docker-compose.yml          # Orquestração de todos os containers
├── .env.example                # Template de variáveis de ambiente
├── .gitignore
├── README.md                   # Este ficheiro
│
├── Backend/
│   ├── api-gateway/            # Gateway HTTP — ponto de entrada único
│   │   ├── Dockerfile          # Multi-stage build (node:20-alpine)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── main.ts         # Bootstrap Fastify + escuta na PORT
│   │   │   ├── app.module.ts
│   │   │   ├── health.controller.ts
│   │   │   └── health.service.ts
│   │   └── test/
│   │
│   ├── auth-service/           # Autenticação (JWT, login, registo)
│   │   ├── Dockerfile
│   │   ├── src/                # Mesma estrutura base dos outros serviços
│   │   └── ...
│   │
│   ├── user-service/           # Gestão de perfis de utilizador
│   │   └── ...
│   │
│   ├── wallet-service/         # Carteira / saldo virtual
│   │   └── ...
│   │
│   ├── campaign-service/       # Campanhas e eventos
│   │   └── ...
│   │
│   └── notification-service/   # Notificações (push, email, etc.)
│       └── ...
│
├── secrets/                    # Docker Secrets (NÃO committar valores reais)
│   ├── README.md               # Documentação dos secrets
│   ├── auth_db_password.txt
│   ├── campaign_db_password.txt
│   ├── notification_db_password.txt
│   ├── user_db_password.txt
│   ├── wallet_db_password.txt
│   ├── redis_password.txt
│   └── jwt_secret.txt
│
└── docs/
    └── infrastructure.md       # Documentação técnica da infraestrutura
```

### Papel de cada diretório

| Diretório / Ficheiro             | Descrição                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Backend/api-gateway/`          | API Gateway — ponto de entrada público. Encaminha pedidos para os microserviços internos.           |
| `Backend/auth-service/`         | Serviço de autenticação. Gere login, registo, tokens JWT. Base de dados própria (`authDb`).      |
| `Backend/user-service/`         | Serviço de utilizadores. CRUD de perfis. Base de dados própria (`userDb`).                         |
| `Backend/wallet-service/`       | Serviço de carteira. Gestão de saldo e transações. Base de dados própria (`walletDb`).          |
| `Backend/campaign-service/`     | Serviço de campanhas. Criação e gestão de eventos. Base de dados própria (`campaignDb`).        |
| `Backend/notification-service/` | Serviço de notificações. Envio assíncrono de alertas. Base de dados própria (`notificationDb`). |
| `secrets/`                      | Ficheiros de texto com passwords e chaves. Lidos pelo Docker como secrets em runtime.                  |
| `docs/`                         | Documentação técnica adicional (infraestrutura, arquitetura, etc.).                                 |

---

## Serviços e Portas

| Serviço             | Container                | Porta (host) | Porta (container) | Rede(s)                       |
| -------------------- | ------------------------ | ------------ | ----------------- | ----------------------------- |
| API Gateway          | `api-gateway`          | 3000         | 3000              | TransNetwork                  |
| Auth Service         | `auth-service`         | —           | 3001              | TransNetwork, authnet         |
| Campaign Service     | `campaign-service`     | —           | 3002              | TransNetwork, campaignnet     |
| Notification Service | `notification-service` | —           | 3003              | TransNetwork, notificationnet |
| User Service         | `user-service`         | —           | 3004              | TransNetwork, usernet         |
| Wallet Service       | `wallet-service`       | —           | 3005              | TransNetwork, walletnet       |
| Auth DB (PostgreSQL) | `authDb`               | —           | 5432              | authnet                       |
| Campaign DB          | `campaignDb`           | —           | 5432              | campaignnet                   |
| Notification DB      | `notificationDb`       | —           | 5432              | notificationnet               |
| User DB              | `userDb`               | —           | 5432              | usernet                       |
| Wallet DB            | `walletDb`             | —           | 5432              | walletnet                     |
| Redis                | `redis`                | —           | 6379              | TransNetwork                  |

> As portas do host podem ser alteradas em `.env`. Os bancos de dados e Redis não são expostos ao host por segurança.

---

## Environment Variables

Todas as variáveis estão documentadas em [`.env.example`](.env.example).

Resumo:

| Variável                     | Valor padrão   | Descrição                         |
| ----------------------------- | --------------- | ----------------------------------- |
| `NODE_ENV`                  | `production`  | Ambiente de execução              |
| `JWT_EXPIRATION`            | `3600`        | Expiração do token JWT (segundos) |
| `API_GATEWAY_PORT`          | `3000`        | Porta pública do API Gateway       |
| `AUTH_SERVICE_PORT`         | `3001`        | Porta interna do Auth Service       |
| `CAMPAIGN_SERVICE_PORT`     | `3002`        | Porta interna do Campaign Service   |
| `NOTIFICATION_SERVICE_PORT` | `3003`        | Porta interna do Notification Svc   |
| `USER_SERVICE_PORT`         | `3004`        | Porta interna do User Service       |
| `WALLET_SERVICE_PORT`       | `3005`        | Porta interna do Wallet Service     |
| `REDIS_HOST`                | `redis`       | Hostname do Redis (container name)  |
| `REDIS_PORT`                | `6379`        | Porta do Redis                      |
| `*_DB_HOST`                 | `<container>` | Hostname do PostgreSQL do serviço  |
| `*_DB_PORT`                 | `5432`        | Porta do PostgreSQL                 |
| `*_DB_NAME`                 | varia           | Nome da base de dados               |
| `*_DB_USER`                 | varia           | Utilizador da base de dados         |

---

## Secrets

As passwords nunca ficam no `.env`. São geridas como **Docker Secrets** (ficheiros em `secrets/`).

Consulta a documentação completa em [`secrets/README.md`](secrets/README.md).

| Ficheiro                         | Usado por                                     |
| -------------------------------- | --------------------------------------------- |
| `auth_db_password.txt`         | `authDb` + `auth-service`                 |
| `campaign_db_password.txt`     | `campaignDb` + `campaign-service`         |
| `notification_db_password.txt` | `notificationDb` + `notification-service` |
| `user_db_password.txt`         | `userDb` + `user-service`                 |
| `wallet_db_password.txt`       | `walletDb` + `wallet-service`             |
| `redis_password.txt`           | `redis` + todos os serviços                |
| `jwt_secret.txt`               | `auth-service` + `api-gateway`            |

---

## Comandos Úteis

```bash
# Subir tudo
docker compose up -d

# Ver logs de um serviço específico
docker compose logs -f auth-service

# Rebuild após alterações de código
docker compose up -d --build <serviço>

# Parar tudo
docker compose down

# Parar tudo E apagar volumes (reset das bases de dados)
docker compose down -v

# Aceder ao shell de um container
docker compose exec auth-service sh

# Aceder ao PostgreSQL de um serviço
docker compose exec authDb psql -U auth_user -d auth
```

---

## Documentação Adicional

- [Documentação técnica da infraestrutura](docs/infrastructure.md)
- [Documentação dos secrets](secrets/README.md)
