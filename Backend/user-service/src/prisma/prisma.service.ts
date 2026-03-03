import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = process.env.DATABASE_URL
      ?? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    if (!dbUrl || dbUrl === 'postgresql://undefined:undefined@undefined:undefined/undefined') {
      throw new Error('Database connection URL is not configured');
    }

    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
    new Logger(PrismaService.name).log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
