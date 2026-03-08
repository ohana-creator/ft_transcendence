## Padrões obrigatórios para serviços backend

O `wallet-service` é a referência de implementação para **todos os serviços** (excepto `auth-service` e `api-gateway`). As features abaixo — **auth**, **database**, **events** e **redis** — devem ser copiadas e seguidas à risca. Qualquer desvio quebra a comunicação entre serviços e a consistência do projecto.

---

### 1. Estrutura de pastas

Cada serviço deve ter estas pastas dentro de `src/`:

```
src/
  auth/
    auth.module.ts
    jwt-auth.guard.ts
    jwt.strategy.ts
    current-user.decorator.ts
  database/
    prisma.module.ts
    prisma.service.ts
  events/
    events.module.ts
    event-consumer.service.ts
  redis/
    redis.module.ts
    redis.service.ts
```

Não renomear ficheiros, não mover para subpastas, não juntar módulos. Cada feature = uma pasta = um módulo.

---

### 2. Auth (`src/auth/`)

Cada serviço valida JWTs **localmente** — não chama o `auth-service` para validar tokens. A lógica é:

**`auth.module.ts`** — Regista `PassportModule` com strategy `jwt` e configura `JwtModule` com o `JWT_SECRET` via `ConfigService`. Exporta o `JwtStrategy`.

**`jwt.strategy.ts`** — Extends `PassportStrategy(Strategy)`. Extrai o token do header `Authorization: Bearer <token>`. No `validate()`:

- Rejeita tokens com `isTwoFA: true` (são tokens temporários de 2FA, não tokens de acesso completo)
- Verifica no Redis se o `jti` está na blacklist (`blacklist:<jti>`) — se estiver, o token foi revogado (logout)
- Retorna `{ userId: payload.sub, email: payload.email, username: payload.username }`

**`jwt-auth.guard.ts`** — Simplesmente extends `AuthGuard('jwt')`. Sem lógica adicional.

**`current-user.decorator.ts`** — Decorator `@CurrentUser()` que extrai `request.user` do contexto HTTP. Usa-se nos controllers para aceder ao utilizador autenticado.

**Como usar nos controllers:**

```ts
@UseGuards(JwtAuthGuard)
@Controller('recurso')
export class RecursoController {
  @Get()
  async get(@CurrentUser() user: { userId: string }) {
    // user.userId, user.email, user.username disponíveis
  }
}
```

---

### 3. Database (`src/database/`)

Usamos **Prisma** com o adapter `@prisma/adapter-pg` (driver nativo PostgreSQL).

**`prisma.module.ts`** — Decorado com `@Global()`. Fornece e exporta `PrismaService`. Por ser global, **não precisa ser importado em cada módulo** — basta importar uma vez no `AppModule`.

**`prisma.service.ts`** — Extends `PrismaClient`. Implementa `OnModuleInit` e `OnModuleDestroy`. No constructor cria o adapter com `PrismaPg` usando `process.env.DATABASE_URL`. Chama `$connect()` no init e `$disconnect()` no destroy.

**`prisma.config.ts`** (raiz do serviço) — Configuração do Prisma CLI com path do schema e migrations.

**`prisma/schema.prisma`** — O generator deve ter:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

O `output` é `../generated/prisma` e o `moduleFormat` é `cjs`. O `DATABASE_URL` não fica no schema — é injectado via environment.

---

### 4. Redis (`src/redis/`)

**`redis.module.ts`** — Decorado com `@Global()`. Fornece e exporta `RedisService`. Global como o Prisma — importar uma vez no `AppModule` e fica disponível em todo o serviço.

**`redis.service.ts`** — Usa `ioredis` directamente (não usa `@nestjs-modules/ioredis` nem nenhum wrapper externo). Conecta via `process.env.REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`. Implementa `OnModuleDestroy` para fazer `quit()` da conexão.

Métodos obrigatórios que todos os serviços precisam:

- `publish(stream, event, data)` — Publica eventos via Redis Streams com `XADD`. O formato é sempre `event` + `payload` (JSON stringified)
- `ensureConsumerGroup(stream, group)` — Cria consumer group com `XGROUP CREATE` + `MKSTREAM`. Ignora erro `BUSYGROUP` (grupo já existe)
- `consumeGroup(stream, group, consumer, count)` — Lê mensagens com `XREADGROUP` com `BLOCK 2000`
- `ack(stream, group, ...ids)` — Confirma processamento com `XACK`
- `isTokenBlacklisted(jti)` — Verifica se `blacklist:<jti>` existe no Redis. **Todos os serviços precisam disto** para validar tokens no `JwtStrategy`

---

### 5. Events (`src/events/`)

É o sistema de comunicação entre serviços. Usa **Redis Streams** (não pub/sub, não RabbitMQ, não Kafka).

**`events.module.ts`** — Importa o módulo de domínio do serviço (ex: `WalletModule`) e regista o `EventConsumerService`.

**`event-consumer.service.ts`** — Implementa `OnModuleInit` e `OnModuleDestroy`. A lógica:

1. No `onModuleInit`: regista handlers, cria consumer groups, inicia polling
2. Cada serviço define o seu `GROUP` (ex: `'wallet-service'`) e `CONSUMER` (ex: `wallet-${process.pid}`)
3. Handlers são registados com `this.on(stream, event, handler)` — ex: `this.on('auth-events', 'user.created', async (payload) => { ... })`
4. O polling corre em loop contínuo com `while (this.running)`, a consumir mensagens do stream
5. Cada mensagem é parsed (campo `event` + campo `payload` JSON) e encaminhada para o handler correcto
6. Após processar (com sucesso ou erro), faz sempre `ACK` da mensagem

**Convenções de nomes de streams e eventos:**

- Streams: `<serviço>-events` (ex: `auth-events`, `campaign-events`, `wallet-events`)
- Eventos: `<entidade>.<acção>` (ex: `user.created`, `campaign.created`)

---

### 6. App Module (`src/app.module.ts`)

O `AppModule` de cada serviço deve importar os módulos **nesta ordem**:

1. `ConfigModule.forRoot({ isGlobal: true })` — configuração global
2. `ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])` — rate limiting
3. `PrismaModule` — base de dados (global)
4. `RedisModule` — Redis (global)
5. `AuthModule` — autenticação JWT
6. Módulos de domínio do serviço (ex: `WalletModule`)
7. `EventsModule` — consumer de eventos

---

### 7. Main (`src/main.ts`)

Todos os serviços usam **Fastify** (não Express):

```ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { cors: true },
);
```

Global pipes obrigatórios:

- `ValidationPipe({ whitelist: true, transform: true })`
- `ClassSerializerInterceptor`

Swagger configurado em `/docs` com `BearerAuth`.

---

### 8. Dependências obrigatórias

Estas dependências devem estar no `package.json` de cada serviço (para além das específicas do domínio):

```
@nestjs/config, @nestjs/jwt, @nestjs/passport, @nestjs/throttler,
@nestjs/platform-fastify, @nestjs/swagger,
@prisma/adapter-pg, @prisma/client,
passport, passport-jwt,
ioredis, class-transformer, class-validator
```

Dev: `prisma`, `@types/passport-jwt`

---

### Resumo

Se estás a criar ou modificar um serviço, copia as pastas `auth/`, `database/`, `events/`, `redis/` do `wallet-service` e adapta apenas a parte de domínio (handlers de eventos, models do Prisma, controllers e services). A infraestrutura de auth, DB, Redis e eventos **não se muda**.
