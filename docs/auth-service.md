# Auth Service — Documentação Técnica Completa

> **Serviço:** `auth-service`  
> **Framework:** NestJS 11 + Fastify  
> **ORM:** Prisma 7 + PostgreSQL 16  
> **Porta:** `3001`  
> **Swagger:** `http://localhost:3001/docs`

---

## Índice

1. [Visão Geral da Arquitetura](#1--visão-geral-da-arquitetura)
2. [Estrutura de Ficheiros](#2--estrutura-de-ficheiros)
3. [Base de Dados — Prisma Schema](#3--base-de-dados--prisma-schema)
4. [Infraestrutura Docker](#4--infraestrutura-docker)
5. [Ponto de Entrada — `main.ts`](#5--ponto-de-entrada--maints)
6. [Módulo Raiz — `app.module.ts`](#6--módulo-raiz--appmodulets)
7. [Base de Dados — PrismaService & PrismaModule](#7--base-de-dados--prismaservice--prismamodule)
8. [Redis — `RedisService`](#8--redis--redisservice)
9. [Módulo Auth — `auth.module.ts`](#9--módulo-auth--authmodulets)
10. [DTOs (Data Transfer Objects)](#10--dtos-data-transfer-objects)
11. [Strategies (Passport)](#11--strategies-passport)
12. [Guards](#12--guards)
13. [Decorators](#13--decorators)
14. [Auth Service — Lógica de Negócio](#14--auth-service--lógica-de-negócio)
15. [Auth Controller — Endpoints HTTP](#15--auth-controller--endpoints-http)
16. [Health Check](#16--health-check)
17. [Fluxos de Autenticação (Diagramas)](#17--fluxos-de-autenticação-diagramas)
18. [Variáveis de Ambiente](#18--variáveis-de-ambiente)
19. [Dependências do Projeto](#19--dependências-do-projeto)
20. [Decisões Arquitecturais](#20--decisões-arquitecturais)

---

## 1 — Visão Geral da Arquitetura

O auth-service é um microserviço responsável exclusivamente por **identidade e autenticação**. Ele não gere perfis de utilizador (isso pertence ao `user-service`) — apenas garante que um utilizador pode ser criado, autenticado, e que os tokens emitidos são válidos.

### Responsabilidades

| Área | Descrição |
|------|-----------|
| **Registo local** | Cria conta com email + username + password (bcrypt) |
| **Login local** | Autentica via email/username + password, emite JWT |
| **OAuth Google** | Registo/login via conta Google (Passport strategy) |
| **2FA (TOTP)** | Setup, verificação e validação de códigos Google Authenticator |
| **Logout** | Invalidação de tokens via blacklist no Redis |
| **Comunicação inter-serviços** | Publica eventos em Redis Streams (`user.created`) |

### Stack Tecnológica

```
NestJS 11 ─── Framework (módulos, DI, decorators)
  └── Fastify ─── HTTP server (não Express)
Prisma 7 ───── ORM com PostgreSQL 16
  └── @prisma/adapter-pg ─── Driver nativo Postgres
Passport.js ── Autenticação (JWT + Google OAuth)
Redis ──────── Blacklist de tokens + Streams para eventos
bcrypt ─────── Hashing de passwords
otplib ─────── Geração/validação de códigos TOTP (2FA)
qrcode ─────── Geração de QR codes para 2FA
```

---

## 2 — Estrutura de Ficheiros

```
Backend/auth-service/
├── prisma/
│   ├── schema.prisma              ← Schema da BD (modelo User + enum)
│   └── migrations/                ← Migrações SQL geradas pelo Prisma
├── src/
│   ├── main.ts                    ← Bootstrap: Fastify, Swagger, pipes globais
│   ├── app.module.ts              ← Módulo raiz: ConfigModule, ThrottlerModule
│   ├── health.controller.ts       ← GET /health
│   ├── health.service.ts          ← Retorna status do serviço
│   ├── redis.service.ts           ← Cliente Redis: blacklist + streams
│   ├── database/
│   │   ├── prisma.module.ts       ← Módulo global que exporta PrismaService
│   │   └── prisma.service.ts      ← Singleton do PrismaClient com adapter pg
│   └── auth/
│       ├── auth.module.ts         ← Módulo Auth: JWT, Passport, providers
│       ├── auth.controller.ts     ← 11 endpoints HTTP com Swagger
│       ├── auth.service.ts        ← Toda a lógica de negócio (401 linhas)
│       ├── dto/
│       │   ├── register.dto.ts    ← Validação do body de registo
│       │   ├── login.dto.ts       ← Validação do body de login
│       │   ├── two-fa-code.dto.ts ← Código TOTP de 6 dígitos
│       │   └── two-fa-validate.dto.ts ← Token temporário + código TOTP
│       ├── strategies/
│       │   ├── jwt.strategy.ts    ← Extrai JWT, verifica blacklist Redis
│       │   └── google.strategy.ts ← OAuth2 com Google
│       ├── guards/
│       │   ├── jwt-auth.guard.ts  ← Protege rotas autenticadas
│       │   └── google-auth.guard.ts ← Inicia fluxo OAuth Google
│       └── decorators/
│           └── current-user.decorator.ts ← @CurrentUser() extrai user do request
├── entrypoint.dev.sh              ← Script de boot: migrate + generate + start
├── package.json                   ← Dependências e scripts
├── tsconfig.json                  ← Configuração TypeScript
├── Dockerfile.dev                 ← Imagem Docker para desenvolvimento
└── prisma.config.ts               ← Config do Prisma CLI (datasource URL)
```

---

## 3 — Base de Dados — Prisma Schema

**Ficheiro:** `prisma/schema.prisma`

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

model User {
  id             String       @id @default(uuid())
  email          String       @unique
  username       String       @unique
  hashedPassword String?
  googleId       String?      @unique
  twoFASecret    String?
  twoFAEnabled   Boolean      @default(false)
  authProvider   AuthProvider  @default(LOCAL)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

enum AuthProvider {
  LOCAL
  GOOGLE
}
```

### Tabela `User` — Campo a campo

| Campo | Tipo | Constraints | Explicação |
|-------|------|-------------|------------|
| `id` | `String` | `@id @default(uuid())` | **UUID v4** gerado automaticamente pelo Postgres. Escolhido em vez de `Int autoincrement` para evitar IDs sequenciais previsíveis e facilitar a comunicação entre microserviços (não depende de sequências locais). |
| `email` | `String` | `@unique` | Email do utilizador. Constraint `UNIQUE` a nível de BD — dois utilizadores nunca podem partilhar o mesmo email. Usado como identificador de login. |
| `username` | `String` | `@unique` | Nome de exibição. Também `UNIQUE`. Validado no DTO para aceitar apenas `[a-zA-Z0-9_]{3,30}`. |
| `hashedPassword` | `String?` | nullable | Hash bcrypt da password (ex: `$2b$10$xyz...`). É **opcional** (`?`) porque utilizadores que se registam via Google OAuth **não têm password** — autenticam-se exclusivamente com o Google. Nunca armazena a password em texto. |
| `googleId` | `String?` | `@unique`, nullable | Identificador único atribuído pelo Google (ex: `"109876543210"`). Opcional porque utilizadores locais não o têm. O constraint `UNIQUE` impede que dois utilizadores apontem para a mesma conta Google. |
| `twoFASecret` | `String?` | nullable | Secret TOTP gerado durante o setup do 2FA (ex: `"JBSWY3DPEHPK3PXP"`). Usado pelo `otplib` para gerar e validar códigos de 6 dígitos. Só existe se o utilizador iniciou o setup do 2FA. |
| `twoFAEnabled` | `Boolean` | `@default(false)` | Flag: `true` = o login requer código TOTP; `false` = login normal. Só muda para `true` após o utilizador completar com sucesso `POST /auth/2fa/verify`. |
| `authProvider` | `AuthProvider` | `@default(LOCAL)` | Enum que indica **como** o utilizador se registou: `LOCAL` (email + password) ou `GOOGLE` (OAuth). Define se a password é requerida ou não. |
| `createdAt` | `DateTime` | `@default(now())` | Timestamp de criação, gerado automaticamente pelo PostgreSQL. |
| `updatedAt` | `DateTime` | `@updatedAt` | Timestamp atualizado automaticamente pelo Prisma em cada `update()`. |

### Enum `AuthProvider`

```
LOCAL  → Registo por email + password
GOOGLE → Registo/login via OAuth Google
```

Enum PostgreSQL nativo — a coluna só aceita estes dois valores, garantindo integridade a nível de BD.

### Cenários de preenchimento

| Cenário | `hashedPassword` | `googleId` | `authProvider` |
|---------|------------------|------------|----------------|
| Registo local | `"$2b$10$..."` | `null` | `LOCAL` |
| Registo via Google | `null` | `"109876..."` | `GOOGLE` |
| Utilizador local que vinculou Google | `"$2b$10$..."` | `"109876..."` | `LOCAL` |

### Nota sobre a ausência da tabela Session

O schema **não tem tabela Session**. Em vez de guardar sessões no PostgreSQL (que seria local ao auth-service e inacessível por outros microserviços), a invalidação de tokens é feita via **Redis blacklist** — um serviço centralizado acessível por toda a infraestrutura. Isto é explicado em detalhe na [secção 8](#8--redis--redisservice) e nas [decisões arquitecturais](#20--decisões-arquitecturais).

### Geração do Client & Migrations

O Prisma Client é gerado para `../generated/prisma` com formato CJS. A cada boot do container, o `entrypoint.dev.sh` executa automaticamente:

```bash
npx prisma generate        # Gera o client TypeScript
npx prisma migrate deploy  # Aplica migrações pendentes
```

---

## 4 — Infraestrutura Docker

### docker-compose.dev.yml (excerto auth)

```yaml
authDb:
  image: postgres:16
  environment:
    POSTGRES_DB: auth
    POSTGRES_USER: auth_user
    POSTGRES_PASSWORD: change_me
  ports: ["5432:5432"]
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U auth_user -d auth"]

auth-service:
  build:
    context: ./Backend/auth-service
    dockerfile: Dockerfile.dev
  ports: ["3001:3001"]
  environment:
    NODE_ENV: development
    PORT: 3001
    DB_HOST: authDb
    DB_PORT: 5432
    DB_NAME: auth
    DB_USER: auth_user
    DB_PASSWORD: change_me
    JWT_SECRET: change_me
    JWT_EXPIRATION: 3600
    REDIS_HOST: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: change_me
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
    GOOGLE_CALLBACK_URL: http://localhost:3001/auth/google/callback
    FRONTEND_URL: http://localhost:3000
  depends_on:
    authDb:  { condition: service_healthy }
    redis:   { condition: service_healthy }
```

### Fluxo de boot (`entrypoint.dev.sh`)

```bash
#!/bin/sh
set -e

# 1. Constrói DATABASE_URL a partir das env vars individuais
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# 2. Constrói REDIS_URL (com password)
export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"

# 3. Prisma: gera o client + aplica migrações
npx prisma generate
npx prisma migrate deploy  # (ou migrate dev --name init se não existir pasta migrations/)

# 4. Inicia a aplicação (recebe CMD do Dockerfile)
exec "$@"
```

**Porquê construir URLs no entrypoint?** Porque o `docker-compose.dev.yml` usa variáveis separadas (`DB_HOST`, `DB_PORT`, etc.) em vez de uma `DATABASE_URL` monolítica. Isto facilita a leitura e permite reutilizar as mesmas variáveis para outros propósitos. O entrypoint combina-as antes do boot.

---

## 5 — Ponto de Entrada — `main.ts`

**Ficheiro:** `src/main.ts`

```typescript
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { cors: true },
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger setup...

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
```

### Explicação detalhada

1. **`NestFactory.create<NestFastifyApplication>`**  
   Cria a aplicação NestJS usando o **Fastify** como HTTP server (não Express). O Fastify é ~2x mais rápido em benchmarks e tem melhor suporte para TypeScript. A opção `cors: true` ativa CORS globalmente.

2. **`ValidationPipe({ whitelist: true, transform: true })`**  
   - `whitelist: true` → Remove automaticamente qualquer propriedade do body que **não** esteja definida no DTO. Protege contra mass assignment.
   - `transform: true` → Converte automaticamente os tipos do body para os tipos definidos no DTO (ex: `"123"` → `123` se o DTO espera `number`).

3. **`ClassSerializerInterceptor`**  
   Permite usar decorators como `@Exclude()` nas entidades para omitir campos automaticamente nas respostas (ex: `hashedPassword`). Usa o `Reflector` internamente para ler metadados.

4. **Swagger (`DocumentBuilder`)**  
   Configura a documentação automática OpenAPI:
   - Título: "Auth Service API"
   - Autenticação: `Bearer` JWT
   - Tag: "Auth"
   - URL: `http://localhost:3001/docs`
   - `persistAuthorization: true` → O Swagger UI guarda o token entre reloads.

5. **`app.listen('0.0.0.0')`**  
   Escuta em todas as interfaces de rede. Necessário dentro de Docker — se ouvisse apenas `127.0.0.1`, não seria acessível fora do container.

---

## 6 — Módulo Raiz — `app.module.ts`

**Ficheiro:** `src/app.module.ts`

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    AuthModule,
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
```

### Explicação detalhada

| Import | Propósito |
|--------|-----------|
| `ConfigModule.forRoot({ isGlobal: true })` | Carrega variáveis de ambiente para toda a aplicação. `isGlobal: true` → não precisa ser importado em cada módulo individualmente. Permite usar `ConfigService.get('JWT_SECRET')` em qualquer provider. |
| `ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])` | Rate limiting global: máximo **30 requests por minuto** por IP. Protege contra brute-force. O `POST /auth/login` tem um limite ainda mais restrito (5/min) definido no controller. |
| `AuthModule` | Módulo de autenticação — contém toda a lógica de auth, JWT, strategies. |
| `PrismaModule` | Módulo global de base de dados — exporta `PrismaService`. |

O `HealthController` e `HealthService` ficam diretamente no módulo raiz por serem transversais ao serviço.

---

## 7 — Base de Dados — PrismaService & PrismaModule

### PrismaService

**Ficheiro:** `src/database/prisma.service.ts`

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter: pool });
  }

  async onModuleInit() { this.$connect(); }
  async onModuleDestroy() { this.$disconnect(); }
}
```

**O que faz:**

1. **Estende `PrismaClient`** — Isto significa que `PrismaService` **é** um `PrismaClient`. Qualquer código pode fazer `this.prisma.user.create(...)` diretamente.

2. **`PrismaPg` adapter** — Prisma 7 introduziu driver adapters. Em vez de usar o engine binário do Prisma, usa o cliente nativo `pg` do Node.js. Isto reduz o tamanho do bundle e melhora a performance.

3. **`OnModuleInit`** → Liga à BD quando o módulo arranca.

4. **`OnModuleDestroy`** → Desliga da BD quando o módulo é destruído (graceful shutdown).

### PrismaModule

**Ficheiro:** `src/database/prisma.module.ts`

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

`@Global()` → O `PrismaService` fica disponível em **toda a aplicação** sem precisar importar `PrismaModule` em cada módulo. Qualquer service pode injetar `PrismaService` no constructor.

---

## 8 — Redis — `RedisService`

**Ficheiro:** `src/redis.service.ts`

```typescript
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  // Token Blacklist
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void>;
  async isTokenBlacklisted(jti: string): Promise<boolean>;

  // Redis Streams
  async addToStream(stream: string, data: Record<string, any>): Promise<string>;
}
```

### Funcionalidade 1: Token Blacklist

O `RedisService` mantém uma **blacklist de tokens JWT** no Redis. Quando um utilizador faz logout, o `jti` (JWT ID) do token é adicionado ao Redis com um TTL igual ao tempo restante do token.

```
Chave:  blacklist:<jti>
Valor:  "1"
TTL:    tempo restante até o JWT expirar
```

**Porquê Redis e não uma tabela Session no PostgreSQL?**

| Critério | Tabela Session (Postgres) | Blacklist (Redis) |
|----------|---------------------------|-------------------|
| **Acessibilidade** | Apenas o auth-service pode aceder à sua BD | Todos os microserviços acedem ao Redis partilhado |
| **Performance** | Query SQL a cada request autenticado | Lookup in-memory O(1) |
| **Limpeza automática** | Precisa de cron job para limpar expirados | TTL nativo — Redis apaga automaticamente |
| **Tamanho** | Cresce com cada login (uma row por sessão) | Apenas tokens invalidados (muito menos) |
| **Semântica** | Allowlist (verifica se existe) | Blacklist (verifica se foi revogado) |

#### `blacklistToken(jti, ttlSeconds)`

```typescript
async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  await this.client.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
}
```

- Recebe o `jti` (UUID único do token) e o TTL em segundos.
- Usa `SET key value EX ttl` — o Redis apaga a chave automaticamente quando o TTL expira.
- Após o TTL expirar, o token já estaria inválido de qualquer forma (JWT expired), por isso não há fuga de memória.

#### `isTokenBlacklisted(jti)`

```typescript
async isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await this.client.get(`blacklist:${jti}`);
  return result !== null;
}
```

- Chamado pela `JwtStrategy` em **cada request autenticado**.
- Se a chave existe → token foi revogado → rejeitar com `401`.
- Se a chave não existe → token válido (ou nunca foi revogado).

### Funcionalidade 2: Redis Streams

Os Redis Streams são usados para comunicação assíncrona entre microserviços. Ao contrário do Pub/Sub (fire-and-forget), os Streams persistem as mensagens — se um consumer estiver offline quando o evento é publicado, pode lê-lo quando voltar.

#### `addToStream(stream, data)`

```typescript
async addToStream(stream: string, data: Record<string, any>): Promise<string> {
  const id = await this.client.xadd(stream, '*', 'payload', JSON.stringify(data));
  return id;
}
```

- **`XADD`** → Adiciona uma entrada ao stream.
- **`*`** → O Redis gera automaticamente o ID da mensagem (timestamp-based).
- **`'payload'`** → Nome do campo no stream entry.
- **`JSON.stringify(data)`** → O corpo serializado como JSON.

**Streams usados:**

| Stream | Quando publicado | Payload |
|--------|------------------|---------|
| `user.created` | Após registo local ou primeiro login Google | `{ id, email, username, authProvider }` |

O `user-service` e outros microserviços consomem este stream para criar registos locais (perfil, wallet, etc.).

### Ligação ao Redis

Usa uma **única conexão** `ioredis` (não precisa de duas como Pub/Sub). Configuração via variáveis de ambiente:

```
REDIS_HOST=redis       (nome do container Docker)
REDIS_PORT=6379
REDIS_PASSWORD=change_me
```

---

## 9 — Módulo Auth — `auth.module.ts`

**Ficheiro:** `src/auth/auth.module.ts`

```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: `${config.get<number>('JWT_EXPIRATION', 3600)}s`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RedisService, JwtStrategy, GoogleStrategy],
  exports: [AuthService, RedisService],
})
export class AuthModule {}
```

### Explicação detalhada

| Elemento | Propósito |
|----------|-----------|
| `PassportModule.register({ defaultStrategy: 'jwt' })` | Regista o Passport.js com strategy padrão JWT. Quando um guard não especifica a strategy, usa JWT automaticamente. |
| `JwtModule.registerAsync(...)` | Registra o módulo JWT **de forma assíncrona** para poder injetar o `ConfigService` e ler as variáveis de ambiente. O `secret` vem de `JWT_SECRET` e a expiração de `JWT_EXPIRATION` (default: 3600 segundos = 1 hora). |
| `AuthService` | Toda a lógica de negócio de autenticação. |
| `RedisService` | Cliente Redis para blacklist e streams. |
| `JwtStrategy` | Strategy Passport que valida tokens JWT + verifica blacklist. |
| `GoogleStrategy` | Strategy Passport para OAuth 2.0 com Google. |
| `exports: [AuthService, RedisService]` | Permite que outros módulos usem estes services se necessário. |

### JWT — Configuração

O JWT é configurado com:

- **Secret:** `JWT_SECRET` (env var). Deve ter no mínimo 32 caracteres em produção.
- **Expiração:** `JWT_EXPIRATION` segundos (default: `3600` = 1h). Sufixo `s` adicionado pois o `JwtModule` espera uma string (`"3600s"`).
- **Payload:** `{ sub: userId, email, username, jti }` — nunca inclui dados sensíveis.
- **jti:** UUID v4 gerado em `crypto.randomUUID()` — identificador único de cada token, usado para blacklisting.

---

## 10 — DTOs (Data Transfer Objects)

Os DTOs validam e tipam os bodies dos requests HTTP. Usam `class-validator` para validação e `@nestjs/swagger` para documentação automática.

### RegisterDto

**Ficheiro:** `src/auth/dto/register.dto.ts`

```typescript
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(3) @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, { message: '...' })
  username!: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, { message: '...' })
  password!: string;
}
```

| Campo | Validações | Regras |
|-------|-----------|--------|
| `email` | `@IsEmail()`, `@IsNotEmpty()` | Deve ser um email válido RFC 5322 |
| `username` | `@MinLength(3)`, `@MaxLength(30)`, regex | 3-30 caracteres: letras, números e underscore |
| `password` | Regex `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/` | Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 dígito |

**Porquê o `!`?** O `!` é o operador de "definite assignment assertion" do TypeScript. Diz ao compiler que o campo será preenchido (pelo NestJS via body parsing), evitando erros de `strictPropertyInitialization`.

### LoginDto

**Ficheiro:** `src/auth/dto/login.dto.ts`

```typescript
export class LoginDto {
  @IsString() @IsNotEmpty()
  identifier!: string;   // email OU username

  @IsString() @IsNotEmpty()
  password!: string;
}
```

O campo chama-se `identifier` (não `email`) porque aceita **tanto email como username**. O serviço faz `findFirst` com `OR: [{ email }, { username }]`.

### TwoFACodeDto

**Ficheiro:** `src/auth/dto/two-fa-code.dto.ts`

```typescript
export class TwoFACodeDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
```

Valida que o código TOTP é exatamente uma string de **6 caracteres**. Usado em `POST /auth/2fa/verify` e `POST /auth/2fa/disable`.

### TwoFAValidateDto

**Ficheiro:** `src/auth/dto/two-fa-validate.dto.ts`

```typescript
export class TwoFAValidateDto {
  @IsString()
  tempToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
```

Usado em `POST /auth/2fa/validate` (última etapa do login com 2FA). Combina o token temporário recebido no login com o código TOTP do Authenticator.

---

## 11 — Strategies (Passport)

### JwtStrategy

**Ficheiro:** `src/auth/strategies/jwt.strategy.ts`

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_pass',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.isTwoFA) {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.jti) {
      const isBlacklisted = await this.redisService.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return { userId: payload.sub, email: payload.email, username: payload.username };
  }
}
```

**Fluxo de execução (a cada request autenticado):**

1. O Passport extrai o token do header `Authorization: Bearer <token>`.
2. Verifica a assinatura com `JWT_SECRET` e que não expirou (`ignoreExpiration: false`).
3. Se válido, chama `validate(payload)` com o payload descodificado.
4. **Verifica se é um token 2FA temporário** (`isTwoFA: true`) → Se sim, rejeita. Tokens temporários só são válidos em `POST /auth/2fa/validate`.
5. **Verifica a blacklist Redis** → Se o `jti` está blacklisted, rejeita com `401`.
6. Se tudo OK, retorna `{ userId, email, username }` que é injetado em `request.user`.

**Interface `JwtPayload`:**

```typescript
export interface JwtPayload {
  sub: string;       // UUID do utilizador
  email: string;
  username: string;
  jti: string;       // JWT ID — UUID único deste token
  isTwoFA?: boolean; // true = token temporário de 2FA
}
```

### GoogleStrategy

**Ficheiro:** `src/auth/strategies/google.strategy.ts`

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const user = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || '',
      displayName: profile.displayName || '',
    };
    done(null, user);
  }
}
```

**O que faz:**

1. Configura o OAuth2 com: `clientID`, `clientSecret`, `callbackURL` e escopos (`email`, `profile`).
2. No `validate()`, o Google já autenticou o utilizador e retornou o perfil. A strategy extrai `googleId`, `email` e `displayName`.
3. Chama `done(null, user)` → o Passport coloca este objecto em `request.user`.
4. O controller então chama `authService.handleGoogleUser(req.user)` para criar/vincular a conta.

**Nota sobre Fastify:** O `passport-google-oauth20` foi desenhado para Express. Com Fastify, o NestJS usa um adapter interno, mas pode haver incompatibilidades. Testar cedo.

---

## 12 — Guards

### JwtGuard

**Ficheiro:** `src/auth/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
```

Ativa a `JwtStrategy` para a rota decorada. Quando usado com `@UseGuards(JwtGuard)`, o request só prossegue se o token for válido e não estiver blacklisted. Caso contrário, retorna `401 Unauthorized`.

**Rotas que usam este guard:**
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/verify`
- `POST /auth/2fa/disable`

### GoogleAuthGuard

**Ficheiro:** `src/auth/guards/google-auth.guard.ts`

```typescript
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
```

Ativa a `GoogleStrategy`. Na rota `GET /auth/google`, redireciona o browser para o consentimento do Google. Na rota `GET /auth/google/callback`, troca o `code` por um access token e obtém o perfil.

---

## 13 — Decorators

### @CurrentUser()

**Ficheiro:** `src/auth/decorators/current-user.decorator.ts`

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
```

É um **custom parameter decorator** do NestJS. Após o `JwtGuard` validar o token, o Passport injeta o resultado de `JwtStrategy.validate()` em `request.user`. Este decorator extrai esse objecto para que possa ser usado diretamente nos parâmetros do controller:

```typescript
async getMe(@CurrentUser() user: { userId: string }) {
  // user = { userId: "uuid...", email: "...", username: "..." }
}
```

Sem este decorator, seria necessário fazer `@Req() req` e aceder a `req.user` manualmente.

---

## 14 — Auth Service — Lógica de Negócio

**Ficheiro:** `src/auth/auth.service.ts` (401 linhas)

Este é o ficheiro central do serviço. Contém toda a lógica de autenticação. Cada método é explicado abaixo.

### Dependências injetadas

```typescript
constructor(
  private readonly prisma: PrismaService,   // Acesso à BD
  private readonly jwt: JwtService,         // Geração/validação de JWTs
  private readonly config: ConfigService,   // Variáveis de ambiente
  private readonly redis: RedisService,     // Blacklist + Streams
) {}
```

### Helpers privados

#### `generateToken(user)`

```typescript
private generateToken(user: { id: string; email: string; username: string }) {
  const jti = crypto.randomUUID();
  const payload = { sub: user.id, email: user.email, username: user.username, jti };
  const token = this.jwt.sign(payload);
  return { token, jti };
}
```

- Gera um UUID v4 como `jti` (JWT ID) — identificador único que permite revogar este token específico.
- Assina o payload com o `JWT_SECRET` configurado no `JwtModule`.
- Retorna o token e o jti (o jti é usado para blacklisting).

#### `generateTempToken(userId)`

```typescript
private generateTempToken(userId: string) {
  return this.jwt.sign(
    { sub: userId, isTwoFA: true, jti: crypto.randomUUID() },
    { expiresIn: '5m' },
  );
}
```

- Gera um token JWT **temporário** com flag `isTwoFA: true` e expiração de **5 minutos**.
- Este token é emitido durante o login quando o 2FA está ativo.
- A `JwtStrategy` rejeita tokens com `isTwoFA: true` — eles só são aceites no endpoint `POST /auth/2fa/validate`.

#### `sanitizeUser(user)`

```typescript
private sanitizeUser(user: { id: string; email: string; username: string; authProvider: string }) {
  return { id: user.id, email: user.email, username: user.username, authProvider: user.authProvider };
}
```

- Remove campos sensíveis (`hashedPassword`, `twoFASecret`, `googleId`) antes de retornar o objecto ao cliente.
- Nunca retorna o user completo da BD — apenas os campos seguros.

---

### `register(data: RegisterDto)`

**Endpoint:** `POST /auth/register`

**Fluxo passo a passo:**

```
1. Recebe { email, username, password }
2. Hash da password com bcrypt (10 salt rounds)
3. Cria o user no PostgreSQL com authProvider: LOCAL
4. Gera JWT com jti único
5. Publica evento "user.created" no Redis Stream
6. Retorna { success: true, data: { user, accessToken } }
```

**Tratamento de erros:**
- Se o email ou username já existe → Prisma lança erro `P2002` (unique constraint violation) → `409 Conflict`.
- Qualquer outro erro é re-thrown.

**Porquê `bcrypt.hash(password, 10)`?**  
O `10` são os **salt rounds** — o custo computacional do hash. 10 é o padrão recomendado (produz ~10 hashes/segundo num CPU moderno). Aumentar para 12-14 em produção torna brute-force mais lento, mas também aumenta o tempo de resposta do registo/login.

**Porquê publicar `user.created`?**  
O auth-service cria a identidade mínima (email, username, password hash). Outros microserviços (user-service, wallet-service) precisam criar registos complementares (perfil, saldo inicial). O Redis Stream garante que, mesmo que um consumer esteja offline, a mensagem persiste.

---

### `login(data: LoginDto)`

**Endpoint:** `POST /auth/login`

**Fluxo passo a passo:**

```
1. Recebe { identifier, password }
2. Busca user por email OU username (findFirst com OR)
3. Se não existe OU não tem password → 401 (mensagem genérica)
4. Compara password com bcrypt.compare()
5. Se inválida → 401 (mesma mensagem genérica)
6. Se 2FA ativo:
   └→ Gera tempToken (5min, isTwoFA: true)
   └→ Retorna { requiresTwoFA: true, tempToken }
7. Se 2FA não ativo:
   └→ Gera JWT completo
   └→ Retorna { success: true, data: { user, accessToken } }
```

**Segurança: mensagem genérica no 401**  
A resposta é sempre `"Invalid credentials"` — nunca "email não encontrado" ou "password incorreta". Isto impede que um atacante descubra se um email está registado (user enumeration attack).

**Porquê `findFirst` com `OR`?**  
Permite login tanto com email como com username. O campo chama-se `identifier` no DTO para ser agnóstico.

**Verificação `!user.hashedPassword`**  
Se o utilizador se registou via Google, não tem password. Impede login local para contas Google-only.

---

### `logout(rawToken: string)`

**Endpoint:** `POST /auth/logout`

**Fluxo:**

```
1. Recebe o token raw do header Authorization
2. Decodifica (sem verificar!) para extrair { jti, exp }
3. Calcula TTL = exp - now (tempo restante)
4. Se TTL > 0 → SET blacklist:<jti> "1" EX <ttl> no Redis
5. O token é agora efetivamente inválido
```

**Porquê `jwt.decode()` e não `jwt.verify()`?**  
O logout é **best-effort**. Mesmo que o token seja malformado ou inválido, o logout não deve falhar. O `decode()` apenas extrai o payload sem verificar a assinatura. Se falhar, o catch vazio ignora o erro.

**Porquê TTL?**  
Não faz sentido manter um token na blacklist eternamente. Assim que o JWT expira naturalmente, a entrada Redis também é eliminada automaticamente — zero desperdício de memória.

---

### `getMe(userId: string)`

**Endpoint:** `GET /auth/me`

```typescript
async getMe(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, twoFAEnabled: true,
              authProvider: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw new UnauthorizedException('User not found');
  return { success: true, data: user };
}
```

- Usa `select` explícito para **nunca** retornar `hashedPassword`, `twoFASecret` ou `googleId`.
- O `userId` vem do JWT (validado pelo `JwtGuard` + `JwtStrategy`).

---

### 2FA: `setup2FA(userId)`

**Endpoint:** `POST /auth/2fa/setup`

```
1. Busca o user
2. Se 2FA já está ativo → 400 Bad Request
3. Gera secret TOTP com otplib
4. Guarda twoFASecret no user (update)
5. Gera QR code como data URL (base64 PNG)
6. Retorna { secret, qrCodeUrl }
```

**O que é o `otpauthUrl`?**  
URI no formato `otpauth://totp/ft_transcendence:user@email.com?secret=XXX&issuer=ft_transcendence`. O Google Authenticator (e outras apps) interpretam este URI para configurar o código rotativo.

**O `qrCodeUrl`** é a imagem do QR code como data URL (`data:image/png;base64,...`). O frontend pode mostrar diretamente num `<img>` tag sem precisar de fazer download.

---

### 2FA: `verify2FA(userId, code)`

**Endpoint:** `POST /auth/2fa/verify`

```
1. Busca user e o twoFASecret
2. Se não tem secret → 400 (setup não iniciado)
3. Valida o código TOTP com otplib.authenticator.verify()
4. Se inválido → 401
5. Se válido → UPDATE user SET twoFAEnabled = true
6. A partir de agora, o login requer código 2FA
```

**Porquê validar antes de ativar?**  
Garante que o utilizador configurou o Authenticator corretamente. Se ativássemos sem validar, o utilizador poderia ficar trancado fora da conta (secret errado).

---

### 2FA: `disable2FA(userId, code)`

**Endpoint:** `POST /auth/2fa/disable`

```
1. Busca user
2. Se 2FA não está ativo → 400
3. Valida o código TOTP (prova que ainda tem acesso)
4. Se válido → UPDATE user SET twoFAEnabled = false, twoFASecret = null
```

**Porquê pedir o código?**  
Sem validação, qualquer pessoa com acesso a um token roubado poderia desativar o 2FA. Pedir o código prova que o utilizador ainda controla o Authenticator.

---

### 2FA: `validate2FALogin(tempToken, code)`

**Endpoint:** `POST /auth/2fa/validate`

```
1. Verifica o tempToken (jwt.verify) — pode lançar se expirado
2. Verifica flag isTwoFA — rejeita se não for um temp token
3. Busca user pelo sub (userId no payload)
4. Valida o código TOTP
5. Se tudo OK → gera JWT completo (sem isTwoFA), retorna user + accessToken
```

Este é o **segundo passo do login com 2FA**. O fluxo completo é:

```
   Cliente                      Servidor
   ──────                      ─────────
   POST /auth/login ────────►  Valida credenciais
                               2FA ativo → gera tempToken
   ◄──── { requiresTwoFA, tempToken }
   
   Mostra input de código
   Utilizador insere código
   
   POST /auth/2fa/validate ──►  Verifica tempToken + código
                                 Gera JWT completo
   ◄──── { user, accessToken }
```

---

### `handleGoogleUser(profile)`

**Endpoint:** `GET /auth/google/callback`

```
1. Busca user por googleId
2. Se encontrou → login (user existente)
3. Se não encontrou:
   a. Busca por email (pode ser um user local)
   b. Se email existe → vincula googleId ao user existente
   c. Se email não existe → cria novo user:
      - Gera username a partir de displayName (sanitizado)
      - Se username já existe → adiciona sufixo baseado em timestamp
      - authProvider = GOOGLE, sem password
4. Se user é novo → publica "user.created" no Redis Stream
5. Gera JWT e retorna
```

**Cenários detalhados:**

| Cenário | Google ID existe? | Email existe? | Acção |
|---------|-------------------|---------------|-------|
| User Google já registado | ✅ | — | Login normal |
| User local liga Google | ❌ | ✅ | UPDATE: adiciona googleId |
| User completamente novo | ❌ | ❌ | CREATE: novo user GOOGLE |

**Geração de username para OAuth:**  
O displayName do Google (ex: "João Silva") é sanitizado: caracteres especiais viram `_`, truncado a 25 chars. Se já existir um username igual, adiciona um sufixo baseado em timestamp Base36 (ex: `Joao_Silva_lk3f5`).

---

## 15 — Auth Controller — Endpoints HTTP

**Ficheiro:** `src/auth/auth.controller.ts`

### Sumário de todos os endpoints

| # | Método | Rota | Auth | Rate Limit | Status | Descrição |
|---|--------|------|------|------------|--------|-----------|
| 1 | `POST` | `/auth/register` | — | Global (30/min) | `201` | Registo local |
| 2 | `POST` | `/auth/login` | — | **5/min** | `200` | Login local |
| 3 | `POST` | `/auth/logout` | JWT | Global | `204` | Blacklist token |
| 4 | `GET` | `/auth/me` | JWT | Global | `200` | Perfil do user |
| 5 | `POST` | `/auth/2fa/setup` | JWT | Global | `200` | Gera QR code |
| 6 | `POST` | `/auth/2fa/verify` | JWT | Global | `200` | Activa 2FA |
| 7 | `POST` | `/auth/2fa/disable` | JWT | Global | `200` | Desactiva 2FA |
| 8 | `POST` | `/auth/2fa/validate` | — | Global | `200` | Completa login 2FA |
| 9 | `GET` | `/auth/google` | — | — | `302` | Redirect Google |
| 10 | `GET` | `/auth/google/callback` | — | — | `302` | Callback Google |
| 11 | `GET` | `/health` | — | — | `200` | Health check |

### Detalhes de cada endpoint

#### 1. `POST /auth/register`

```
Request:  { "email": "user@mail.com", "username": "john_doe", "password": "Str0ngP@ss" }
Response: { "success": true, "data": { "user": { "id": "uuid", ... }, "accessToken": "eyJ..." } }
Erros:    409 → email/username duplicado
```

#### 2. `POST /auth/login`

```
Request:  { "identifier": "user@mail.com", "password": "Str0ngP@ss" }

Response (sem 2FA):
  { "success": true, "data": { "user": {...}, "accessToken": "eyJ..." } }

Response (com 2FA):
  { "success": true, "requiresTwoFA": true, "tempToken": "eyJ..." }

Erros:    401 → credenciais inválidas, 429 → rate limit
```

**Rate limiting:** O `@Throttle({ default: { ttl: 60000, limit: 5 } })` limita a **5 tentativas por minuto** por IP neste endpoint específico. O `@UseGuards(ThrottlerGuard)` ativa a verificação. Resposta `429 Too Many Requests` se excedido.

#### 3. `POST /auth/logout`

```
Headers:  Authorization: Bearer <token>
Response: 204 No Content (body vazio)
```

#### 4. `GET /auth/me`

```
Headers:  Authorization: Bearer <token>
Response: { "success": true, "data": { "id": "uuid", "email": "...", "username": "...",
            "twoFAEnabled": false, "authProvider": "LOCAL", "createdAt": "...", "updatedAt": "..." } }
Erros:    401 → token inválido/expirado/blacklisted
```

#### 5. `POST /auth/2fa/setup`

```
Headers:  Authorization: Bearer <token>
Response: { "success": true, "data": { "secret": "JBSWY3DPEHPK3PXP", "qrCodeUrl": "data:image/png;base64,..." } }
Erros:    400 → 2FA já ativo, 401 → não autenticado
```

#### 6. `POST /auth/2fa/verify`

```
Headers:  Authorization: Bearer <token>
Request:  { "code": "123456" }
Response: { "success": true, "message": "2FA enabled successfully" }
Erros:    400 → setup não iniciado, 401 → código inválido
```

#### 7. `POST /auth/2fa/disable`

```
Headers:  Authorization: Bearer <token>
Request:  { "code": "123456" }
Response: { "success": true, "message": "2FA disabled successfully" }
Erros:    400 → 2FA não ativo, 401 → código inválido
```

#### 8. `POST /auth/2fa/validate`

```
Request:  { "tempToken": "eyJ...", "code": "123456" }
Response: { "success": true, "data": { "user": {...}, "accessToken": "eyJ..." } }
Erros:    401 → temp token expirado/inválido, código 2FA inválido
```

#### 9-10. Google OAuth

```
GET /auth/google          → Redirect 302 para Google consent screen
GET /auth/google/callback → Recebe code, troca por token, redirect para frontend
                            → 302 http://localhost:3000/auth/callback?token=eyJ...
```

#### 11. `GET /health`

```
Response: { "status": "ok", "service": "auth-service", "timestamp": "2026-03-01T..." }
```

---

## 16 — Health Check

**Ficheiros:** `src/health.controller.ts` + `src/health.service.ts`

```typescript
// Controller
@Get('health')
getHealth() { return this.healthService.getHealth(); }

// Service
getHealth() {
  return { status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() };
}
```

Endpoint simples para monitorização. Usado pelo Docker healthcheck, load balancers e outros serviços para verificar se o auth-service está vivo.

---

## 17 — Fluxos de Autenticação (Diagramas)

### Fluxo 1: Registo Local

```
Cliente                         auth-service                  PostgreSQL          Redis
──────                         ────────────                  ──────────          ─────
POST /auth/register
  { email, username, password }
         │
         ├──────────────────────► ValidationPipe
         │                        (valida RegisterDto)
         │                              │
         │                              ▼
         │                        bcrypt.hash(password, 10)
         │                              │
         │                              ▼
         │                        prisma.user.create() ─────► INSERT INTO "User"
         │                              │                     ◄──── OK (uuid)
         │                              ▼
         │                        jwt.sign({ sub, email,
         │                          username, jti })
         │                              │
         │                              ▼
         │                        redis.addToStream ──────────────────────────► XADD user.created
         │                          ('user.created', {...})                     { id, email, ... }
         │                              │
         ◄──────────────────────── 201 { success, data:
                                    { user, accessToken } }
```

### Fluxo 2: Login com 2FA

```
Cliente                         auth-service                  Redis
──────                         ────────────                  ─────
POST /auth/login
  { identifier, password }
         │
         ├──────────────────────► Busca user por email/username
         │                        bcrypt.compare(password)
         │                        user.twoFAEnabled === true
         │                              │
         │                        jwt.sign({ sub, isTwoFA: true },
         │                          { expiresIn: '5m' })
         │                              │
         ◄──────────────────────── 200 { requiresTwoFA: true,
                                         tempToken }
         │
  [Mostra input 2FA]
         │
POST /auth/2fa/validate
  { tempToken, code }
         │
         ├──────────────────────► jwt.verify(tempToken)
         │                        payload.isTwoFA === true ✓
         │                        Busca user, valida TOTP
         │                              │
         │                        jwt.sign({ sub, email,
         │                          username, jti })
         │                              │
         ◄──────────────────────── 200 { success, data:
                                    { user, accessToken } }
```

### Fluxo 3: Google OAuth

```
Browser                          auth-service            Google              Redis
───────                          ────────────            ──────              ─────
GET /auth/google
   │
   ├─────────────────────────────► GoogleAuthGuard
   │                               Passport redirect
   │                                    │
   ◄────────────────────────── 302 Location: https://accounts.google.com/...
   │
   ├── Browser navega para Google ──────────────────────►
   │                                                    Consent screen
   │                                                    User autoriza
   ◄──────────────────────────────────────────────────── 302 /auth/google/callback?code=xxx
   │
   ├─ GET /auth/google/callback?code=xxx ──────────────►
   │                               Passport troca code ──► Token exchange
   │                                                   ◄── Profile { id, email, name }
   │                               handleGoogleUser()
   │                                 - findUnique(googleId)
   │                                 - create/update user
   │                                 - XADD user.created ────────────────► (se novo)
   │                                 - generateToken()
   │                                    │
   ◄──────────────────────────── 302 Location: http://localhost:3000/auth/callback?token=eyJ...
```

### Fluxo 4: Logout (Blacklist)

```
Cliente                         auth-service                  Redis
──────                         ────────────                  ─────
POST /auth/logout
  Authorization: Bearer <token>
         │
         ├──────────────────────► JwtGuard: valida token
         │                        Extrai token do header
         │                        jwt.decode(token)
         │                          → { jti, exp }
         │                        ttl = exp - now()
         │                              │
         │                        redis.blacklistToken() ────────────────► SET blacklist:<jti> "1"
         │                          (jti, ttl)                             EX <ttl>
         │                              │
         ◄──────────────────────── 204 No Content
         │
  [Request seguinte com mesmo token]
         │
GET /auth/me
  Authorization: Bearer <token>
         │
         ├──────────────────────► JwtStrategy.validate()
         │                        isTokenBlacklisted(jti) ───────────────► GET blacklist:<jti>
         │                            │                                    ◄── "1" (exists)
         │                        blacklisted = true
         │                              │
         ◄──────────────────────── 401 "Token has been revoked"
```

---

## 18 — Variáveis de Ambiente

| Variável | Default | Obrigatória | Descrição |
|----------|---------|-------------|-----------|
| `PORT` | `3001` | Não | Porta do HTTP server |
| `NODE_ENV` | — | Não | `development` / `production` |
| `DB_HOST` | — | Sim | Hostname do PostgreSQL (`authDb` em Docker) |
| `DB_PORT` | — | Sim | Porta do PostgreSQL (`5432`) |
| `DB_NAME` | — | Sim | Nome da base de dados (`auth`) |
| `DB_USER` | — | Sim | Utilizador PostgreSQL (`auth_user`) |
| `DB_PASSWORD` | — | Sim | Password PostgreSQL |
| `JWT_SECRET` | `'default_pass'` | Sim | Secret para assinar JWTs (mín 32 chars em prod) |
| `JWT_EXPIRATION` | `3600` | Não | Expiração do JWT em segundos (1h default) |
| `REDIS_HOST` | `'localhost'` | Sim | Hostname Redis (`redis` em Docker) |
| `REDIS_PORT` | `6379` | Não | Porta Redis |
| `REDIS_PASSWORD` | — | Sim | Password Redis |
| `GOOGLE_CLIENT_ID` | `''` | Para OAuth | Client ID do Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `''` | Para OAuth | Client Secret do Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `''` | Para OAuth | URL de callback (ex: `http://localhost:3001/auth/google/callback`) |
| `FRONTEND_URL` | `'http://localhost:3000'` | Não | URL do frontend (para redirect após Google OAuth) |

As variáveis `DB_*` são combinadas no `entrypoint.dev.sh` para formar a `DATABASE_URL`:
```
postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public
```

---

## 19 — Dependências do Projeto

### Dependências de Produção

| Pacote | Versão | Propósito |
|--------|--------|-----------|
| `@nestjs/common` | 11.x | Decorators, pipes, guards, exceptions |
| `@nestjs/core` | 11.x | Kernel do NestJS (DI, módulos, lifecycle) |
| `@nestjs/platform-fastify` | 11.x | Adapter Fastify para NestJS |
| `@nestjs/jwt` | 11.x | Módulo para gerar/validar JWT |
| `@nestjs/passport` | 11.x | Integração Passport.js ↔ NestJS |
| `@nestjs/config` | 4.x | ConfigModule para env vars tipadas |
| `@nestjs/throttler` | 6.x | Rate limiting nativo |
| `@nestjs/swagger` | 11.x | Documentação OpenAPI automática |
| `@prisma/client` | 7.x | ORM TypeScript para PostgreSQL |
| `@prisma/adapter-pg` | 7.x | Driver adapter nativo pg |
| `passport` | 0.7.x | Biblioteca base de autenticação |
| `passport-jwt` | 4.x | Strategy para validar JWT |
| `passport-google-oauth20` | 2.x | Strategy para OAuth Google |
| `bcrypt` | 6.x | Hashing de passwords (bcrypt algorithm) |
| `ioredis` | 5.x | Cliente Redis para Node.js |
| `otplib` | 13.x | TOTP: geração e verificação (2FA) |
| `qrcode` | 1.x | Geração de QR codes para 2FA |
| `class-validator` | 0.14.x | Decorators de validação para DTOs |
| `class-transformer` | 0.5.x | Serialização/deserialização de classes |
| `rxjs` | 7.x | Reactive programming (dependência NestJS) |

### Dependências de Desenvolvimento

| Pacote | Propósito |
|--------|-----------|
| `@types/bcrypt` | Tipagens TypeScript para bcrypt |
| `@types/passport-jwt` | Tipagens para passport-jwt |
| `@types/passport-google-oauth20` | Tipagens para Google OAuth |
| `@types/qrcode` | Tipagens para qrcode |
| `prisma` | CLI do Prisma (migrations, generate) |
| `jest` | Framework de testes |
| `ts-jest` | Transpilador TypeScript para Jest |
| `supertest` | HTTP assertions para testes e2e |
| `typescript` | Compiler TypeScript |
| `eslint` + `prettier` | Linting e formatação |

---

## 20 — Decisões Arquitecturais

### 1. Redis Blacklist em vez de Tabela Session

**Problema:** JWTs são stateless — uma vez emitidos, são válidos até expirar. Para implementar "logout real", é preciso manter estado em algum lado.

**Opção rejeitada (tabela Session no PostgreSQL):**
- Cada login cria uma row, cada request autenticado faz uma query SQL.
- A tabela está no BD do auth-service — outros microserviços não a conseguem consultar.
- Precisa de cron job para limpar sessões expiradas.

**Opção escolhida (blacklist no Redis):**
- Apenas tokens **revogados** são armazenados (muito menos que o total de sessões).
- Redis é partilhado por todos os microserviços na rede `devnet`.
- TTL nativo — limpeza automática quando o JWT expiraria naturalmente.
- Lookup O(1) in-memory — ordens de magnitude mais rápido que query SQL.

### 2. UUID em vez de Int para IDs

**Problema:** `Int autoincrement` é sequencial e previsível. Num sistema de microserviços, IDs sequenciais podem causar colisões se dois serviços tentarem usar o mesmo schema.

**Decisão:** `String @default(uuid())` — UUIDs v4 são únicos globalmente, não-sequenciais, e não dependem de uma sequência do PostgreSQL. São ideais para comunicação entre microserviços.

### 3. Redis Streams em vez de Pub/Sub

**Problema:** Redis Pub/Sub é fire-and-forget — se um consumer está offline, perde a mensagem.

**Decisão:** Redis Streams (`XADD`) persiste as mensagens. Consumers podem usar `XREAD` ou `XREADGROUP` para ler mensagens por onde pararam. Isto garante que eventos como `user.created` não são perdidos, mesmo durante deploy/restart de outros serviços.

### 4. Token temporário para 2FA

**Problema:** Durante o login com 2FA, o servidor precisa saber **quem** está a tentar completar o 2FA sem ter emitido um token de acesso completo.

**Decisão:** Gera um JWT temporário com:
- `isTwoFA: true` → flag que a `JwtStrategy` rejeita (não é um token de acesso)
- `expiresIn: '5m'` → expira em 5 minutos
- `sub: userId` → identifica o utilizador

Isto evita manter estado no servidor (não precisa de sessão temporária na BD ou Redis).

### 5. Fastify em vez de Express

O NestJS suporta ambos. Fastify foi escolhido por:
- Performance superior (~2x em benchmarks de requests/segundo)
- Schema-based validation nativo
- Melhor suporte TypeScript
- Menos middleware overhead

**Nota:** Requer atenção com bibliotecas Express-only (como `passport-google-oauth20`). O NestJS adapter geralmente resolve, mas deve ser testado.

---

*Documentação gerada a 1 de março de 2026. Reflete o estado actual do código fonte do auth-service.*
