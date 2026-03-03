# Wallet Service — Roadmap de Implementação

> **Epic:** #4 — Carteira Digital e Transações
> **Serviço:** `wallet-service` (porta `3005`)
> **Dependência concluída:** `auth-service`
> **Duração estimada:** Semana 2–3

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Fase 1 — Fundação (Database + Prisma)](#3-fase-1--fundação-database--prisma)
4. [Fase 2 — Módulos Base](#4-fase-2--módulos-base)
5. [Fase 3 — Wallet (Criação + Leitura)](#5-fase-3--wallet-criação--leitura)
6. [Fase 4 — Transferências P2P](#6-fase-4--transferências-p2p)
7. [Fase 5 — Contribuição para Campanhas](#7-fase-5--contribuição-para-campanhas)
8. [Fase 6 — Eventos (Redis Streams)](#8-fase-6--eventos-redis-streams)
9. [Fase 7 — Segurança e Anti-Double-Spending](#9-fase-7--segurança-e-anti-double-spending)
10. [Fase 8 — Auditoria e Logging](#10-fase-8--auditoria-e-logging)
11. [Fase 9 — Swagger + Validação Final](#11-fase-9--swagger--validação-final)
12. [Fase 10 — Testes](#12-fase-10--testes)
13. [Fase 11 — Documentação Técnica](#13-fase-11--documentação-técnica)
14. [Checklist Final](#14-checklist-final)
15. [Referência de Ficheiros a Criar](#15-referência-de-ficheiros-a-criar)

---

## 1. Visão Geral

O Wallet Service é responsável por:

- Criar uma carteira VAKS automaticamente quando um utilizador é criado (`user.created`)
- Expor endpoints REST para consultar saldo, fazer transferências P2P e ver histórico
- Fornecer um endpoint interno para o Campaign Service debitar contribuições
- Publicar eventos assíncronos via Redis Streams (`transfer.completed`, `contribution.completed`)
- Garantir **zero double-spending** com transações atómicas e locking pessimista

**Arquitetura seguida:** mesma do `auth-service` — Fastify, Prisma 7 com `@prisma/adapter-pg`, Redis via `ioredis`, `class-validator` DTOs, `@nestjs/swagger`, `@nestjs/config` global.

---

## 2. Pré-requisitos

Antes de começar, certifica-te que:

- [ ] Docker e Docker Compose estão instalados
- [ ] O projeto sobe com `docker compose -f docker-compose.dev.yml up`
- [ ] O container `walletDb` (PostgreSQL na porta `5436`) está acessível
- [ ] O container `redis` (porta `6379`) está acessível
- [ ] Tens o `auth-service` funcional (para gerar tokens JWT de teste)

**Comando de verificação:**

```bash
docker compose -f docker-compose.dev.yml up -d walletDb redis auth-service authDb
docker compose -f docker-compose.dev.yml exec walletDb pg_isready
```

### Variáveis de Ambiente Necessárias

O `docker-compose.dev.yml` já define estas variáveis para o wallet-service. Verifica que estão presentes:

```yaml
wallet-service:
  environment:
    - DATABASE_URL=postgresql://wallet_user:change_me@walletDb:5432/wallet
    - JWT_SECRET=your-super-secret-jwt-key-change-in-production  # ← Mesmo valor do auth-service!
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - PORT=3005
```

> **Crítico:** O `JWT_SECRET` **tem de ser idêntico** em `auth-service` e `wallet-service`. Caso contrário, o wallet-service rejeita todos os tokens como inválidos.

---

## 3. Fase 1 — Fundação (Database + Prisma)

**Objetivo:** Configurar o Prisma com o schema do Wallet e gerar o cliente.

### Passo 1.1 — Instalar dependências

```bash
cd Backend/wallet-service

# Dependências de produção
npm install @prisma/client@7 @prisma/adapter-pg@7 @nestjs/config@4

# Dependências de desenvolvimento
npm install -D prisma@7
```

### Passo 1.2 — Criar `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../generated/prisma"
  moduleFormat    = "cjs"
}

datasource db {
  provider = "postgresql"
}

model Wallet {
  id                   String        @id @default(uuid())
  userId               String        @unique  // FK para User.id (UUID da Auth Service)
  balance              Float         @default(0)
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  sentTransactions     Transaction[] @relation("SentTransactions")
  receivedTransactions Transaction[] @relation("ReceivedTransactions")
}

model Transaction {
  id           String            @id @default(uuid())
  fromWalletId String?
  toWalletId   String?
  amount       Float
  type         TransactionType
  status       TransactionStatus @default(PENDING)
  metadata     Json?
  createdAt    DateTime          @default(now())
  fromWallet   Wallet?           @relation("SentTransactions", fields: [fromWalletId], references: [id], onDelete: Restrict)
  toWallet     Wallet?           @relation("ReceivedTransactions", fields: [toWalletId], references: [id], onDelete: Restrict)

  @@index([fromWalletId])
  @@index([toWalletId])
  @@index([createdAt])
  @@index([type])
  @@index([status])
}

enum TransactionType {
  P2P_TRANSFER
  CAMPAIGN_CONTRIBUTION
  CAMPAIGN_WITHDRAWAL
  INITIAL_DEPOSIT
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}
```

### Explicação do Schema

| Campo/Relação                 | Tipo      | Propósito                                                       |
| ------------------------------- | --------- | ---------------------------------------------------------------- |
| `Wallet.id`                   | UUID      | PK — gerado automaticamente                                     |
| `Wallet.userId`               | UUID      | FK para `User.id` da Auth Service — **unique**          |
| `Wallet.balance`              | Float     | Saldo em VAKS — começa a 0 quando criada                       |
| `Wallet.sentTransactions`     | Relação | Array de transações**enviadas** por esta wallet          |
| `Wallet.receivedTransactions` | Relação | Array de transações**recebidas** por esta wallet         |
| `Transaction.id`              | UUID      | PK — gerado automaticamente                                     |
| `Transaction.fromWalletId`    | UUID      | FK para wallet que**enviou** (nullable para depósitos)    |
| `Transaction.toWalletId`      | UUID      | FK para wallet que**recebeu** (nullable para debitações) |
| `Transaction.type`            | Enum      | `P2P_TRANSFER`, `CAMPAIGN_CONTRIBUTION`, etc.                |
| `Transaction.status`          | Enum      | `PENDING` → `COMPLETED` ou `FAILED`                       |
| `Transaction.metadata`        | JSON      | Dados extras (nota, campaignId, motivo falha)                    |
| `onDelete: Restrict`          | -         | Previne apagar uma Wallet enquanto tem transações              |

### Porquê Duas Relações?

Uma transação P2P **envolve duas wallets diferentes**:

- A wallet do **remetente** (`fromWalletId`) — aparece em `sentTransactions`
- A wallet do **destinatário** (`toWalletId`) — aparece em `receivedTransactions`

O Prisma precisa de **dois nomes de relação distintos** porque há **duas foreign keys diferentes** apontando para o mesmo model:

```typescript
// No código:
const wallet = await prisma.wallet.findUnique({
  where: { userId: "550e8400-e29b-41d4-a716-446655440000" },
  include: {
    sentTransactions: true,        // Transferências que ENVIOU
    receivedTransactions: true,    // Transferências que RECEBEU
  },
});

// wallet.sentTransactions[0] 
//   → { id: "uuid1", fromWalletId: "wallet-uuid-5", toWalletId: "wallet-uuid-10", ... }
// wallet.receivedTransactions[0] 
//   → { id: "uuid2", fromWalletId: "wallet-uuid-20", toWalletId: "wallet-uuid-5", ... }
```

### Passo 1.3 — Criar `prisma.config.ts`

Copia o padrão do `auth-service`:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### Passo 1.4 — Verificar que o `entrypoint.dev.sh` já gere Prisma

O ficheiro `entrypoint.dev.sh` do wallet-service já faz:

```bash
if [ -f "prisma/schema.prisma" ]; then
  npx prisma generate
  npx prisma migrate deploy || npx prisma migrate dev --name init
fi
```

Isto significa que ao subir o container, as migrations são aplicadas automaticamente.

### Passo 1.5 — Testar

```bash
docker compose -f docker-compose.dev.yml up -d wallet-service walletDb
docker compose -f docker-compose.dev.yml logs -f wallet-service
# Deves ver: "prisma generate" + "prisma migrate" a correr sem erros
```

### Entregáveis da Fase 1:

- [X] `prisma/schema.prisma` com Wallet, Transaction, enums
- [X] `prisma.config.ts`
- [X] Dependências Prisma instaladas
- [X] Migration inicial criada e aplicada

---

## 4. Fase 2 — Módulos Base

**Objetivo:** Criar o PrismaModule, RedisService e configurar o `app.module.ts`.

### Passo 2.1 — Instalar dependências adicionais

```bash
npm install ioredis class-validator class-transformer @nestjs/swagger@11 @nestjs/throttler@6
```

### Passo 2.2 — Criar `src/database/prisma.service.ts`

Segue exatamente o padrão do `auth-service`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter: pool });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Passo 2.3 — Criar `src/database/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Passo 2.4 — Criar `src/redis/redis.service.ts`

```typescript
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /** Publicar evento no Redis Stream */
  async publishEvent(stream: string, data: Record<string, any>): Promise<string> {
    const fields = Object.entries(data).flat().map(String);
    const id = await this.client.xadd(stream, '*', ...fields);
    this.logger.log(`Published to ${stream}: ${id}`);
    return id;
  }

  /** Ler eventos de um stream (para o listener de user.created) */
  async readStream(stream: string, lastId: string = '0', count: number = 10) {
    return this.client.xread('COUNT', count, 'BLOCK', 1000, 'STREAMS', stream, lastId);
  }

  /** Ler eventos continuamente com XREADGROUP (consumer group) */
  async createConsumerGroup(stream: string, group: string) {
    try {
      await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) throw err;
      // Grupo já existe — ok
    }
  }

  async readGroup(stream: string, group: string, consumer: string, count: number = 10) {
    return this.client.xreadgroup('GROUP', group, consumer, 'COUNT', count, 'BLOCK', 2000, 'STREAMS', stream, '>');
  }

  async ack(stream: string, group: string, ...ids: string[]) {
    return this.client.xack(stream, group, ...ids);
  }

  getClient(): Redis {
    return this.client;
  }
}
```

### Passo 2.5 — Criar `src/redis/redis.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

### Passo 2.6 — Atualizar `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WalletModule } from './wallet/wallet.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    RedisModule,
    WalletModule,  // adicionamos na Fase 3
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
```

### Passo 2.7 — Atualizar `src/main.ts`

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { cors: true },
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription('ft_transcendence Digital Wallet & Transactions API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      'bearer',
    )
    .addTag('Wallet')
    .addTag('Transactions')
    .build();

  const swagger = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, swagger, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3005, '0.0.0.0');
}
bootstrap();
```

### Entregáveis da Fase 2:

- [X] `src/database/prisma.service.ts` + `prisma.module.ts`
- [X] `src/redis/redis.service.ts` + `redis.module.ts`
- [X] `app.module.ts` atualizado
- [X] `main.ts` com Swagger e validação global

---

## 5. Fase 3 — Wallet (Criação + Leitura)

**Objetivo:** Endpoints `GET /wallet` e `GET /wallet/balance`, mais a função de criação de carteira.

### Contexto: Autenticação entre Microserviços

Nesta fase vamos proteger os endpoints do Wallet Service com autenticação JWT. Como funciona:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   User/Client   │         │  Auth Service   │         │ Wallet Service  │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                            │
         │  POST /auth/login         │                            │
         │─────────────────────────>│                            │
         │                           │                            │
         │  { accessToken: "..." }   │                            │
         │ <─────────────────────────│                            │
         │                           │                            │
         │  GET /wallet              │                            │
         │  Authorization: Bearer token                           │
         │───────────────────────────────────────────────────────>│
         │                           │                            │
         │                           │       (valida o token      │
         │                           │        com JWT_SECRET)     │
         │                           │                            │
         │                      { wallet data }                   │
         │ <───────────────────────────────────────────────────────│
```

**Key points:**
- O Auth Service **emite** tokens (assina com `JWT_SECRET`)
- O Wallet Service **valida** tokens (verifica assinatura com o mesmo `JWT_SECRET`)
- **Não há comunicação** entre os dois serviços durante a validação
- É **stateless** — o token contém toda a info necessária (`userId`, `email`, `username`)

---

### Passo 3.1 — Autenticação JWT (Validação de tokens)

O Wallet Service precisa **validar** tokens JWT emitidos pelo Auth Service. 

**Como funciona:**
1. Auth Service **emite** tokens JWT assinados com `JWT_SECRET`
2. Wallet Service **valida** esses tokens usando o **mesmo `JWT_SECRET`**
3. Os serviços **não partilham código** — criamos uma cópia local da estratégia JWT

> **Importante:** Não estamos a importar código do auth-service. Estamos a **recriar localmente** o padrão de validação JWT.

**`src/auth/jwt.strategy.ts`** (criar novo ficheiro no wallet-service)

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload.sub) throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email, username: payload.username };
  }
}
```

**`src/auth/jwt-auth.guard.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**`src/auth/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**`src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule {}
```

Dependências necessárias:

```bash
npm install @nestjs/passport@11 @nestjs/jwt@11 passport passport-jwt
npm install -D @types/passport-jwt
```

### ⚠️ Nota sobre Microserviços

Os 4 ficheiros acima (`jwt.strategy.ts`, `jwt-auth.guard.ts`, `current-user.decorator.ts`, `auth.module.ts`) são **novos ficheiros criados no wallet-service**. 

**NÃO estás a:**
- ❌ Importar código do auth-service
- ❌ Partilhar ficheiros entre serviços
- ❌ Criar dependências entre serviços

**Estás a:**
- ✅ Criar código **local** no wallet-service
- ✅ Usar o **mesmo padrão** que o auth-service já usa
- ✅ Validar tokens com a **mesma chave** (`JWT_SECRET` partilhada via variável de ambiente)

Isto é **stateless JWT** — qualquer serviço que conheça o `JWT_SECRET` pode validar tokens, sem contactar o auth-service.

---

> **Adicionar `AuthModule` ao `app.module.ts` imports do wallet-service:**

```typescript
// Backend/wallet-service/src/app.module.ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
  AuthModule,  // ← Adicionar este (o local, não do auth-service!)
  PrismaModule,
  RedisModule,
  WalletModule,
],
```

### Passo 3.2 — Criar `src/wallet/wallet.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Criar carteira para um userId (chamado pelo event listener) */
  async createWallet(userId: string, initialBalance: number = 0) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) {
      this.logger.warn(`Wallet already exists for userId=${userId}`);
      return existing;
    }

    const wallet = await this.prisma.wallet.create({
      data: { userId, balance: initialBalance },
    });

    this.logger.log(`Wallet created for userId=${userId}`);
    return wallet;
  }

  /** Obter carteira pelo userId */
  async getWalletByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
    return wallet;
  }

  /** Obter apenas o saldo */
  async getBalance(userId: string) {
    const wallet = await this.getWalletByUserId(userId);
    return { balance: wallet.balance };
  }
}
```

### Passo 3.3 — Criar `src/wallet/wallet.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { WalletService } from './wallet.service.js';

@ApiTags('Wallet')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet of authenticated user' })
  async getWallet(@CurrentUser() user: { userId: string }) {
    return this.walletService.getWalletByUserId(user.userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get balance of authenticated user' })
  async getBalance(@CurrentUser() user: { userId: string }) {
    return this.walletService.getBalance(user.userId);
  }
}
```

### Passo 3.4 — Criar `src/wallet/wallet.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';

@Module({
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
```

### Passo 3.5 — Testar

```bash
# Criar uma wallet manualmente para testar (ou via Prisma Studio)
docker compose -f docker-compose.dev.yml exec wallet-service \
  npx prisma studio

# Testar o endpoint
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"..."}' | jq -r '.accessToken')

curl -H "Authorization: Bearer $TOKEN" http://localhost:3005/wallet
curl -H "Authorization: Bearer $TOKEN" http://localhost:3005/wallet/balance
```

### Entregáveis da Fase 3:

- [X] JWT Strategy + Guard + CurrentUser decorator
- [X] `WalletService.createWallet()`, `getWalletByUserId()`, `getBalance()`
- [X] `GET /wallet` e `GET /wallet/balance` funcionais
- [X] `WalletModule` registado no `AppModule`

---

## 6. Fase 4 — Transferências P2P

**Objetivo:** `POST /wallet/transfer` e `GET /wallet/transactions` com proteção anti-double-spending.

### Passo 4.1 — Criar DTOs

**`src/wallet/dto/transfer.dto.ts`**

```typescript
import { IsUUID, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ description: 'ID do utilizador destinatário (UUID)' })
  @IsUUID()
  toUserId: string;

  @ApiProperty({ description: 'Montante a transferir (max 2 casas decimais)', example: 100.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Nota opcional' })
  @IsOptional()
  @IsString()
  note?: string;
}
```

**`src/wallet/dto/transactions-query.dto.ts`**

```typescript
import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionTypeFilter {
  P2P_TRANSFER = 'P2P_TRANSFER',
  CAMPAIGN_CONTRIBUTION = 'CAMPAIGN_CONTRIBUTION',
  CAMPAIGN_WITHDRAWAL = 'CAMPAIGN_WITHDRAWAL',
  INITIAL_DEPOSIT = 'INITIAL_DEPOSIT',
}

export class TransactionsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TransactionTypeFilter })
  @IsOptional()
  @IsEnum(TransactionTypeFilter)
  type?: TransactionTypeFilter;
}
```

### Passo 4.2 — Adicionar método `transfer()` ao `WalletService`

Este é o método **mais crítico** de todo o serviço. Utiliza `Prisma.$transaction` com isolamento `Serializable` e `SELECT ... FOR UPDATE` para lock pessimista:

```typescript
async transfer(fromUserId: string, dto: TransferDto) {
  const { toUserId, amount, note } = dto;

  if (fromUserId === toUserId) {
    throw new BadRequestException('CANNOT_TRANSFER_TO_SELF');
  }

  // Transação atómica com isolamento serializable
  const result = await this.prisma.$transaction(async (tx) => {
    // 1. Lock pessimista: SELECT FOR UPDATE nas duas wallets
    const [fromWallet] = await tx.$queryRawUnsafe<Wallet[]>(
      'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
      fromUserId,
    );
    if (!fromWallet) throw new NotFoundException('SENDER_WALLET_NOT_FOUND');

    const [toWallet] = await tx.$queryRawUnsafe<Wallet[]>(
      'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
      toUserId,
    );
    if (!toWallet) throw new NotFoundException('RECIPIENT_WALLET_NOT_FOUND');

    // 2. Verificar saldo
    if (fromWallet.balance < amount) {
      throw new BadRequestException('INSUFFICIENT_FUNDS');
    }

    // 3. Debitar remetente
    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { decrement: amount } },
    });

    // 4. Creditar destinatário
    await tx.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: amount } },
    });

    // 5. Criar transação
    const transaction = await tx.transaction.create({
      data: {
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount,
        type: 'P2P_TRANSFER',
        status: 'COMPLETED',
        metadata: note ? { note } : undefined,
      },
    });

    return {
      transaction,
      newBalance: fromWallet.balance - amount,
    };
  }, {
    isolationLevel: 'Serializable',
    timeout: 10000,
  });

  return result;
}
```

> **Por que `SELECT ... FOR UPDATE`?**
> O lock pessimista garante que se dois pedidos tentarem debitar a mesma wallet em simultâneo, o segundo bloqueia até o primeiro terminar. Isto previne **double-spending** porque o segundo pedido lê o saldo **já atualizado** pelo primeiro.

### Passo 4.3 — Adicionar método `getTransactions()` (paginado)

```typescript
async getTransactions(userId: string, query: TransactionsQueryDto) {
  const wallet = await this.getWalletByUserId(userId);
  const { page, limit, type } = query;
  const skip = (page - 1) * limit;

  const where: any = {
    OR: [
      { fromWalletId: wallet.id },
      { toWalletId: wallet.id },
    ],
  };

  if (type) {
    where.type = type;
  }

  const [transactions, total] = await Promise.all([
    this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Passo 4.4 — Adicionar método `getTransactionById()`

```typescript
async getTransactionById(transactionId: string, userId: string) {
  const wallet = await this.getWalletByUserId(userId);
  const transaction = await this.prisma.transaction.findFirst({
    where: {
      id: transactionId,
      OR: [
        { fromWalletId: wallet.id },
        { toWalletId: wallet.id },
      ],
    },
  });
  if (!transaction) throw new NotFoundException('TRANSACTION_NOT_FOUND');
  return transaction;
}
```

### Passo 4.5 — Atualizar o Controller

Adicionar ao `WalletController`:

```typescript
@Post('transfer')
@HttpCode(201)
@ApiOperation({ summary: 'Transfer VAKS to another user' })
async transfer(
  @CurrentUser() user: { userId: string },
  @Body() dto: TransferDto,
) {
  return this.walletService.transfer(user.userId, dto);
}

@Get('transactions')
@ApiOperation({ summary: 'Get paginated transaction history' })
async getTransactions(
  @CurrentUser() user: { userId: string },
  @Query() query: TransactionsQueryDto,
) {
  return this.walletService.getTransactions(user.userId, query);
}
```

Criar um controller separado para transações:

**`src/wallet/transaction.controller.ts`**

```typescript
@ApiTags('Transactions')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  async getTransaction(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.walletService.getTransactionById(id, user.userId);
  }
}
```

### Passo 4.6 — Testar

```bash
# Transfer
curl -X POST http://localhost:3005/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": 5, "amount": 100.50, "note": "Pagamento jantar"}'

# Saldo insuficiente
curl -X POST http://localhost:3005/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": 5, "amount": 999999}'
# → 400 INSUFFICIENT_FUNDS

# Histórico
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3005/wallet/transactions?page=1&limit=20"

# Detalhes transação
curl -H "Authorization: Bearer $TOKEN" http://localhost:3005/transactions/1
```

### Entregáveis da Fase 4:

- [X] `TransferDto` + `TransactionsQueryDto`
- [X] `POST /wallet/transfer` com validação completa
- [X] Transação atómica com `SELECT FOR UPDATE`
- [X] `GET /wallet/transactions` paginado com filtros
- [X] `GET /transactions/:id`

---

## 7. Fase 5 — Contribuição para Campanhas

**Objetivo:** Endpoint interno chamado pelo Campaign Service.

### Passo 5.1 — Criar `src/wallet/dto/contribution.dto.ts`

```typescript
import { IsUUID, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContributionDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  campaignId: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
```

### Passo 5.2 — Adicionar método `contributeToCampaign()` ao `WalletService`

```typescript
async contributeToCampaign(dto: ContributionDto) {
  const { userId, campaignId, amount, metadata } = dto;

  const result = await this.prisma.$transaction(async (tx) => {
    // Lock pessimista na wallet
    const [wallet] = await tx.$queryRawUnsafe<Wallet[]>(
      'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
      userId,
    );
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');

    if (wallet.balance < amount) {
      throw new BadRequestException('INSUFFICIENT_FUNDS');
    }

    // Debitar
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    });

    // Registar transação
    const transaction = await tx.transaction.create({
      data: {
        fromWalletId: wallet.id,
        toWalletId: null,
        amount,
        type: 'CAMPAIGN_CONTRIBUTION',
        status: 'COMPLETED',
        metadata: { campaignId, ...metadata },
      },
    });

    return { transaction, newBalance: wallet.balance - amount };
  }, {
    isolationLevel: 'Serializable',
    timeout: 10000,
  });

  return result;
}
```

### Passo 5.3 — Criar `src/wallet/internal.controller.ts`

> Este controller é para chamadas **internas** entre microserviços (Campaign Service → Wallet Service via REST). Uma forma simples de proteger é com um header de API key interna.

```typescript
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { WalletService } from './wallet.service.js';
import { ContributionDto } from './dto/contribution.dto.js';
import { ConfigService } from '@nestjs/config';

@ApiExcludeController() // Não aparece no Swagger público
@Controller('internal/wallet')
export class InternalWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly config: ConfigService,
  ) {}

  @Post('contribute')
  @ApiOperation({ summary: 'Internal: Debit wallet for campaign contribution' })
  async contribute(
    @Body() dto: ContributionDto,
    @Headers('x-internal-key') internalKey: string,
  ) {
    const expectedKey = this.config.get<string>('INTERNAL_API_KEY');
    if (!internalKey || internalKey !== expectedKey) {
      throw new UnauthorizedException('INVALID_INTERNAL_KEY');
    }
    return this.walletService.contributeToCampaign(dto);
  }
}
```

> **Nota sobre `INTERNAL_API_KEY`:** Adiciona esta variável de ambiente ao `docker-compose.dev.yml` para o `wallet-service` e para o `campaign-service`. Exemplo: `INTERNAL_API_KEY=dev-internal-key-change-me`.

### Entregáveis da Fase 5:

- [X] `ContributionDto`
- [X] `contributeToCampaign()` com lock pessimista
- [X] `POST /internal/wallet/contribute` protegido por API key
- [X] `InternalWalletController` registado no `WalletModule`

---

## 8. Fase 6 — Eventos (Redis Streams)

**Objetivo:** Listener de `user.created` + publicação de `transfer.completed` e `contribution.completed`.

### Passo 6.1 — Criar `src/events/event-listener.service.ts`

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { WalletService } from '../wallet/wallet.service.js';

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);
  private readonly STREAM = 'user.created';
  private readonly GROUP = 'wallet-service';
  private readonly CONSUMER = 'wallet-consumer-1';

  constructor(
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  async onModuleInit() {
    await this.redis.createConsumerGroup(this.STREAM, this.GROUP);
    this.startListening();  // ← NÃO faz await! Executa em background
  }

  private async startListening() {
    this.logger.log(`Listening for ${this.STREAM} events...`);

    while (true) {
      try {
        const results = await this.redis.readGroup(
          this.STREAM, this.GROUP, this.CONSUMER, 10,
        );

        if (!results) continue;

        for (const [, messages] of results) {
          for (const [id, fields] of messages as any[]) {
            await this.handleUserCreated(id, fields);
          }
        }
      } catch (err) {
        this.logger.error(`Error reading ${this.STREAM}:`, err);
        await new Promise((r) => setTimeout(r, 5000)); // backoff
      }
    }
  }

  private async handleUserCreated(messageId: string, fields: string[]) {
    // fields = ['userId', '123', 'email', 'user@example.com', ...]
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    const userId = data.userId;  // userId é UUID (string)
    if (!userId) {
      this.logger.warn(`Missing userId in event: ${messageId}`);
      await this.redis.ack(this.STREAM, this.GROUP, messageId);
      return;
    }

    try {
      await this.walletService.createWallet(userId);
      this.logger.log(`Wallet created for userId=${userId} (event ${messageId})`);
    } catch (err) {
      this.logger.error(`Failed to create wallet for userId=${userId}:`, err);
    }

    await this.redis.ack(this.STREAM, this.GROUP, messageId);
  }
}
```

### 📖 Como funciona o Listener em Background

**Pergunta:** Como é que o `while (true)` não trava o serviço inteiro?

**Resposta:** O NestJS usa o **lifecycle hook** `OnModuleInit`:

```typescript
async onModuleInit() {
  await this.redis.createConsumerGroup(this.STREAM, this.GROUP);
  this.startListening();  // ← Repara: NÃO faz await!
}
```

**O que acontece:**

1. **Durante o arranque do serviço:**
   - NestJS chama `onModuleInit()` automaticamente
   - Cria o consumer group (operação rápida, com `await`)
   - Chama `startListening()` **sem `await`**
   - `onModuleInit()` termina imediatamente

2. **Em background (event loop do Node.js):**
   - `startListening()` continua a executar no seu próprio "thread" assíncrono
   - O `while (true)` bloqueia apenas **dentro da sua própria promise chain**
   - O event loop do Node.js alterna entre este listener e outros requests HTTP

3. **Fluxo visual:**

```
┌───────────────────────────────────────────────────────────┐
│  NestJS Bootstrap                                         │
├───────────────────────────────────────────────────────────┤
│  1. Cria módulos (Prisma, Redis, Wallet, Events)         │
│  2. Chama onModuleInit() de todos os serviços            │
│     ├─ EventListenerService.onModuleInit()               │
│     │   ├─ await createConsumerGroup() ✓ (200ms)         │
│     │   └─ startListening() [dispara e esquece]          │
│     └─ (volta ao NestJS)                                 │
│  3. Inicia servidor HTTP na porta 3005 ✓                 │
│  4. Serviço PRONTO para receber requests                 │
└───────────────────────────────────────────────────────────┘
         │                              │
         │                              └─────────────────┐
         │                                                │
         ▼                                                ▼
┌─────────────────────┐                    ┌──────────────────────────┐
│  HTTP Requests      │                    │  Redis Listener          │
│  (FastifyAdapter)   │                    │  (Background Loop)       │
├─────────────────────┤                    ├──────────────────────────┤
│ GET /wallet         │◄───┐               │ while (true) {           │
│ POST /transfer      │    │               │   await readGroup()      │
│ GET /transactions   │    │               │   // BLOCK 2s aguardando │
│                     │    │               │   // eventos...          │
│ [processa requests  │    │               │   if (event) {           │
│  em paralelo]       │    │               │     handleUserCreated()  │
│                     │    │               │   }                      │
└─────────────────────┘    │               └──────────────────────────┘
         │                 │                             │
         └─────── Node.js Event Loop ───────────────────┘
             (alterna entre ambos sem bloqueio)
```

**Key Point:** O `BLOCK` no `XREADGROUP` **não bloqueia o event loop** — é uma operação I/O assíncrona. Enquanto espera por eventos Redis, o Node.js processa HTTP requests normalmente.

### 🔍 Debugging: Como ver o listener a funcionar

```bash
# Logs do wallet-service ao arrancar
docker compose -f docker-compose.dev.yml logs -f wallet-service

# Deves ver:
[EventListenerService] Listening for user.created events...
[NestApplication] Nest application successfully started
```

### ⚠️ Importante: Signature do createWallet

Como o `userId` agora é UUID (string), atualiza a signature no `WalletService`:

```typescript
// wallet.service.ts
async createWallet(userId: string, initialBalance: number = 0) {
  //                        ^^^^^^ UUID é string
  const existing = await this.prisma.wallet.findUnique({ where: { userId } });
  // ...
}
```

### Passo 6.2 — Criar `src/events/event-publisher.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly redis: RedisService) {}

  async publishTransferCompleted(data: {
    transactionId: number;
    fromUserId: number;
    toUserId: number;
    amount: number;
  }) {
    await this.redis.publishEvent('transfer.completed', {
      transactionId: String(data.transactionId),
      fromUserId: String(data.fromUserId),
      toUserId: String(data.toUserId),
      amount: String(data.amount),
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Event transfer.completed published: tx=${data.transactionId}`);
  }

  async publishContributionCompleted(data: {
    transactionId: string;
    userId: string;
    campaignId: string;
    amount: number;
  }) {
    await this.redis.publishEvent('contribution.completed', {
      transactionId: String(data.transactionId),
      userId: String(data.userId),
      campaignId: String(data.campaignId),
      amount: String(data.amount),
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Event contribution.completed published: tx=${data.transactionId}`);
  }

  async publishContributionFailed(data: {
    userId: string;
    campaignId: string;
    reason: string;
  }) {
    await this.redis.publishEvent('contribution.failed', {
      userId: String(data.userId),
      campaignId: String(data.campaignId),
      reason: data.reason,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Passo 6.3 — Criar `src/events/events.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { EventListenerService } from './event-listener.service.js';
import { EventPublisherService } from './event-publisher.service.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [WalletModule],
  providers: [EventListenerService, EventPublisherService],
  exports: [EventPublisherService],
})
export class EventsModule {}
```

### Passo 6.4 — Integrar eventos nos métodos `transfer()` e `contributeToCampaign()`

Injeta `EventPublisherService` no `WalletService` e adiciona publicação após cada transação bem-sucedida:

```typescript
// No final de transfer():
await this.eventPublisher.publishTransferCompleted({
  transactionId: result.transaction.id,
  fromUserId,
  toUserId,
  amount,
});

// No final de contributeToCampaign():
await this.eventPublisher.publishContributionCompleted({
  transactionId: result.transaction.id,
  userId,
  campaignId,
  amount,
});
```

> **Atenção à dependência circular:** `EventsModule` importa `WalletModule` (para o listener criar wallets). Se o `WalletService` precisar do `EventPublisherService`, usa `forwardRef()` ou move o publisher para um módulo separado.
>
> **Solução recomendada:** Extrair `EventPublisherService` para o `RedisModule` (que é `@Global`), mantendo o `EventListenerService` no `EventsModule`.

### Passo 6.5 — Atualizar `app.module.ts`

Adicionar `EventsModule` aos imports.

### Entregáveis da Fase 6:

- [X] `EventListenerService` — escuta `user.created` e cria wallets
- [X] `EventPublisherService` — publica `transfer.completed`, `contribution.completed/failed`
- [X] Consumer group criado automaticamente
- [X] Eventos integrados nos métodos de negócio

---

## 9. Fase 7 — Segurança e Anti-Double-Spending

**Objetivo:** Garantir robustez em concorrência.

### 9.1 — Estratégia implementada

| Camada                  | Mecanismo                                                      |
| ----------------------- | -------------------------------------------------------------- |
| **Base de dados** | `SELECT ... FOR UPDATE` (lock pessimista nas rows da wallet) |
| **Prisma**        | `$transaction` com `isolationLevel: 'Serializable'`        |
| **Aplicação**   | Validação de saldo dentro da transação (após lock)        |

### 9.2 — Como funciona

```
Request A: POST /wallet/transfer {amount: 1000}
Request B: POST /wallet/transfer {amount: 1000}  (simultâneo)
Saldo atual: 1000 VAKS

1. Request A inicia transação → SELECT FOR UPDATE na wallet → bloqueia row
2. Request B inicia transação → SELECT FOR UPDATE na wallet → BLOQUEIA (espera A)
3. Request A verifica saldo=1000, debita 1000 → COMMIT → saldo=0
4. Request B desbloqueia → lê saldo=0 → INSUFFICIENT_FUNDS → ROLLBACK
```

### 9.3 — Teste de concorrência (a fazer na Fase 10)

Script que prova que double-spending não é possível:

```typescript
// Dispara N transferências em paralelo
const promises = Array.from({ length: 10 }, () =>
  fetch('/wallet/transfer', {
    method: 'POST',
    body: JSON.stringify({ toUserId: 2, amount: 100 }),
    headers: { Authorization: `Bearer ${token}` },
  })
);
const results = await Promise.all(promises);
// Apenas floor(saldo/100) devem ter sucesso, o resto INSUFFICIENT_FUNDS
```

### 9.4 — Considerações adicionais

- **Timeout da transação:** 10 segundos — se o lock não for adquirido nesse tempo, a transação falha
- **Deadlocks:** Ao fazer `SELECT FOR UPDATE`, ordena sempre pelo `id` da wallet (menor primeiro) para evitar deadlocks A↔B
- **Decimal precision:** O schema usa `Float`, mas para produção real considerar `Decimal` do Prisma para evitar erros de floating point

### Entregáveis da Fase 7:

- [X] Lock pessimista com `SELECT FOR UPDATE`
- [X] Isolamento `Serializable`
- [X] Documentação da lógica anti-double-spending (esta secção)

---

## 10. Fase 8 — Auditoria e Logging

**Objetivo:** Logs estruturados de todas as transações.

### 10.1 — Logger NestJS

O NestJS já tem um Logger integrado. Usa-o em todos os métodos críticos:

```typescript
this.logger.log(`TRANSFER: userId=${fromUserId} → userId=${toUserId}, amount=${amount}, txId=${tx.id}`);
this.logger.log(`CONTRIBUTION: userId=${userId} → campaignId=${campaignId}, amount=${amount}, txId=${tx.id}`);
this.logger.warn(`INSUFFICIENT_FUNDS: userId=${userId}, requested=${amount}, available=${wallet.balance}`);
this.logger.error(`TRANSFER_FAILED: userId=${fromUserId}, error=${err.message}`);
```

### 10.2 — Auditoria na base de dados

Cada `Transaction` já serve como registo de auditoria:

- `fromWalletId` / `toWalletId` — quem enviou / recebeu
- `type` — tipo de operação
- `status` — resultado (`COMPLETED`, `FAILED`)
- `metadata` — dados extra (nota, campaignId, motivo de falha)
- `createdAt` — timestamp

### 10.3 — Opcional: Criar transações `FAILED`

Para auditoria completa, registar também as tentativas falhadas:

```typescript
// Dentro do catch de INSUFFICIENT_FUNDS:
await this.prisma.transaction.create({
  data: {
    fromWalletId: wallet.id,
    toWalletId: targetWalletId,
    amount,
    type: 'P2P_TRANSFER',
    status: 'FAILED',
    metadata: { reason: 'INSUFFICIENT_FUNDS' },
  },
});
```

### Entregáveis da Fase 8:

- [X] Logs estruturados em todos os métodos de negócio
- [X] Tabela `Transaction` como audit trail
- [X] Transações falhadas registadas (FAILED)

---

## 11. Fase 9 — Swagger + Validação Final

**Objetivo:** Documentação API completa no Swagger.

### 11.1 — Swagger decorators em todos os endpoints

Já foram adicionados nas fases anteriores. Verifica:

| Endpoint                     | Decorators                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /wallet`              | `@ApiOperation`, `@ApiBearerAuth`, `@ApiResponse(200)`, `@ApiResponse(401)`, `@ApiResponse(404)`               |
| `GET /wallet/balance`      | idem                                                                                                                     |
| `POST /wallet/transfer`    | `@ApiOperation`, `@ApiBearerAuth`, `@ApiBody`, `@ApiResponse(201)`, `@ApiResponse(400)`, `@ApiResponse(401)` |
| `GET /wallet/transactions` | `@ApiOperation`, `@ApiBearerAuth`, `@ApiQuery(page, limit, type)`                                                  |
| `GET /transactions/:id`    | `@ApiOperation`, `@ApiBearerAuth`, `@ApiParam(id)`, `@ApiResponse(404)`                                          |

### 11.2 — Verificar Swagger UI

```bash
# Abre no browser
open http://localhost:3005/docs
```

### Entregáveis da Fase 9:

- [X] Swagger completo em todos os endpoints
- [X] Swagger UI acessível em `/docs`

---

## 12. Fase 10 — Testes

**Objetivo:** Testes unitários, de integração e de concorrência.

### 12.1 — Testes unitários (Jest)

**`src/wallet/wallet.service.spec.ts`** — mockar `PrismaService`:

- `createWallet()` — testa criação, testa idempotência (wallet já existe)
- `getWalletByUserId()` — testa sucesso e 404
- `getBalance()` — testa retorno correto
- `transfer()` — testa sucesso, testa `INSUFFICIENT_FUNDS`, testa `CANNOT_TRANSFER_TO_SELF`
- `getTransactions()` — testa paginação
- `getTransactionById()` — testa sucesso e 404

### 12.2 — Testes de integração (e2e)

**`test/wallet.e2e-spec.ts`** — com base de dados real:

- Setup: criar 2 wallets com saldo conhecido
- `GET /wallet` → 200
- `POST /wallet/transfer` → 201 + saldos atualizados
- `POST /wallet/transfer` com saldo insuficiente → 400
- `GET /wallet/transactions` → paginação correta
- `GET /transactions/:id` → detalhes corretos

### 12.3 — Teste de concorrência (double-spending)

```typescript
it('should prevent double-spending under concurrent requests', async () => {
  // Setup: wallet com saldo 100
  // Dispara 10 transferências de 100 em paralelo
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      app.inject({
        method: 'POST',
        url: '/wallet/transfer',
        headers: { authorization: `Bearer ${token}` },
        payload: { toUserId: recipientId, amount: 100 },
      })
    )
  );

  const successes = results.filter(r => r.statusCode === 201);
  const failures = results.filter(r => r.statusCode === 400);

  expect(successes).toHaveLength(1);  // Apenas 1 deve ter sucesso
  expect(failures).toHaveLength(9);   // Os outros devem falhar
});
```

### Entregáveis da Fase 10:

- [X] Testes unitários do `WalletService`
- [X] Testes e2e dos endpoints
- [X] Teste de concorrência double-spending

---

## 13. Fase 11 — Documentação Técnica

**Objetivo:** Documento `docs/wallet-service.md` ao estilo do `docs/auth-service.md`.

Deve cobrir:

1. Visão geral da arquitetura
2. Estrutura de ficheiros
3. Schema Prisma (field-by-field)
4. Bootstrap (`main.ts`)
5. Módulos (`PrismaModule`, `RedisModule`, `WalletModule`, `AuthModule`, `EventsModule`)
6. Serviços (`WalletService`, `RedisService`, `EventListenerService`, `EventPublisherService`)
7. Controllers (`WalletController`, `TransactionController`, `InternalWalletController`)
8. DTOs (validações)
9. Fluxos (criação de wallet, transferência P2P, contribuição para campanha)
10. Anti-double-spending (diagrama + explicação)
11. Eventos (Redis Streams — publicados e consumidos)
12. Variáveis de ambiente
13. Dependências
14. Decisões arquiteturais

### Entregáveis da Fase 11:

- [X] `docs/wallet-service.md` completo

---

## 14. Checklist Final

Antes de considerar o épico concluído, valida todos os pontos:

### Carteira

- [ ] Wallet criada automaticamente ao ouvir `user.created`
- [ ] `GET /wallet` retorna carteira do utilizador autenticado
- [ ] `GET /wallet/balance` retorna apenas saldo

### Transações P2P

- [ ] `POST /wallet/transfer` funcional com todas as validações
- [ ] Transação atómica (deduz + credita)
- [ ] Proteção double-spending confirmada com teste
- [ ] Retorna transação + novo saldo
- [ ] `GET /wallet/transactions?page=1&limit=20&type=...` paginado
- [ ] `GET /transactions/:id` com verificação de ownership

### Contribuição para Campanha

- [ ] `POST /internal/wallet/contribute` funcional
- [ ] Protegido por `x-internal-key`
- [ ] Cria transação `CAMPAIGN_CONTRIBUTION`

### Eventos

- [ ] Listener: `user.created` → cria wallet ✓
- [ ] Publica: `transfer.completed` ✓
- [ ] Publica: `contribution.completed` / `contribution.failed` ✓

### Segurança

- [ ] `SELECT FOR UPDATE` + `Serializable` isolation
- [ ] Timeout na transação
- [ ] Logs de auditoria em todos os métodos

### Infra

- [ ] `prisma/schema.prisma` + migrations
- [ ] `prisma.config.ts`
- [ ] Swagger UI em `/docs`
- [ ] Health check em `/health`

### Testes

- [ ] Unitários
- [ ] E2E
- [ ] Concorrência

### Documentação

- [ ] `docs/wallet-service.md`
- [ ] Lógica anti-double-spending documentada

---

## 15. Referência de Ficheiros a Criar

```
Backend/wallet-service/
├── prisma/
│   └── schema.prisma                          # Fase 1
├── prisma.config.ts                           # Fase 1
├── src/
│   ├── app.module.ts                          # Fase 2 (atualizar)
│   ├── main.ts                                # Fase 2 (atualizar)
│   ├── health.controller.ts                   # Já existe
│   ├── health.service.ts                      # Já existe
│   ├── database/
│   │   ├── prisma.module.ts                   # Fase 2
│   │   └── prisma.service.ts                  # Fase 2
│   ├── redis/
│   │   ├── redis.module.ts                    # Fase 2
│   │   └── redis.service.ts                   # Fase 2
│   ├── auth/
│   │   ├── auth.module.ts                     # Fase 3
│   │   ├── jwt.strategy.ts                    # Fase 3
│   │   ├── jwt-auth.guard.ts                  # Fase 3
│   │   └── current-user.decorator.ts          # Fase 3
│   ├── wallet/
│   │   ├── wallet.module.ts                   # Fase 3
│   │   ├── wallet.controller.ts               # Fase 3 + 4
│   │   ├── wallet.service.ts                  # Fase 3 + 4 + 5
│   │   ├── transaction.controller.ts          # Fase 4
│   │   ├── internal.controller.ts             # Fase 5
│   │   └── dto/
│   │       ├── transfer.dto.ts                # Fase 4
│   │       ├── transactions-query.dto.ts      # Fase 4
│   │       └── contribution.dto.ts            # Fase 5
│   └── events/
│       ├── events.module.ts                   # Fase 6
│       ├── event-listener.service.ts          # Fase 6
│       └── event-publisher.service.ts         # Fase 6
├── test/
│   ├── wallet.e2e-spec.ts                     # Fase 10
│   └── jest-e2e.json                          # Já existe
└── package.json                               # Fase 1 + 2 + 3 (atualizar deps)
```

---

## Ordem de Execução Recomendada

```
Fase 1  →  Fase 2  →  Fase 3  →  Fase 4  →  Fase 5
  │           │          │          │          │
  │           │          │          │          └─ Endpoint interno campanha
  │           │          │          └─ Transferências + Histórico
  │           │          └─ GET /wallet + JWT auth
  │           └─ Prisma + Redis + Swagger setup
  └─ Schema + Migrations

         ↓

Fase 6  →  Fase 7  →  Fase 8  →  Fase 9  →  Fase 10  →  Fase 11
  │           │          │          │           │            │
  │           │          │          │           │            └─ Docs técnicos
  │           │          │          │           └─ Testes
  │           │          │          └─ Swagger polish
  │           │          └─ Audit logs
  │           └─ Confirmar anti-double-spending
  └─ Event listeners + publishers
```

> **Dica:** Faz commit a cada fase concluída. Isto permite fazer rollback fácil e dá visibilidade no PR.
