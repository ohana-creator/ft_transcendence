import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const u = process.env.DB_USER;
  const p = process.env.DB_PASSWORD;
  const h = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const n = process.env.DB_NAME;
  return "postgresql://" + u + ":" + p + "@" + h + ":" + port + "/" + n;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ datasources: { db: { url: buildDatabaseUrl() } } });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Connected to database");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
