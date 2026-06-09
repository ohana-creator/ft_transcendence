import { defineConfig } from 'prisma/config';

const env = (globalThis as {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      env?.DATABASE_URL ??
      `postgresql://${env?.DB_USER ?? 'monolito_user'}:${env?.DB_PASSWORD ?? 'change_me'}@${env?.DB_HOST ?? 'localhost'}:${env?.DB_PORT ?? '5432'}/${env?.DB_NAME ?? 'monolito_db'}?schema=public`,
  },
});
