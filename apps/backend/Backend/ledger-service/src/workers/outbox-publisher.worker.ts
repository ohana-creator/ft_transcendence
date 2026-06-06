import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

type OutboxRow = {
  id: string;
  stream: string;
  event: string;
  payload: unknown;
  attempts: number;
};

@Injectable()
export class OutboxPublisherWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherWorker.name);
  private running = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    if (String(process.env.LEDGER_OUTBOX_ENABLED ?? 'false') === 'false') {
      this.logger.warn('Outbox publisher disabled by LEDGER_OUTBOX_ENABLED=false');
      return;
    }

    this.running = true;
    this.timer = setInterval(
      () => void this.publishLoop(),
      Number(process.env.LEDGER_OUTBOX_INTERVAL_MS ?? 2000),
    );
    void this.publishLoop();
  }

  async onModuleDestroy() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
  }

  private async publishLoop() {
    if (!this.running) return;

    try {
      const batchSize = Number(process.env.LEDGER_OUTBOX_BATCH_SIZE ?? 25);
      const rows = await this.prisma.$queryRaw<OutboxRow[]>`
        SELECT "id", "stream", "event", "payload", "attempts"
        FROM "LedgerOutbox"
        WHERE "status" = 'PENDING'
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
      `;

      for (const row of rows) {
        await this.publishRow(row);
      }
    } catch (error) {
      this.logger.warn(`Outbox scan failed: ${(error as Error).message}`);
    }
  }

  private async publishRow(row: OutboxRow) {
    try {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      await this.redis.publish(row.stream, row.event, payload as Record<string, unknown>);

      await this.prisma.$executeRaw`
        UPDATE "LedgerOutbox"
        SET "status" = 'PUBLISHED',
            "attempts" = "attempts" + 1,
            "publishedAt" = NOW(),
            "lastError" = NULL,
            "nextAttemptAt" = NULL
        WHERE "id" = ${row.id}
      `;
    } catch (error) {
      const nextAttemptAt = new Date(Date.now() + this.computeBackoff(row.attempts));
      await this.prisma.$executeRaw`
        UPDATE "LedgerOutbox"
        SET "status" = 'FAILED',
            "attempts" = "attempts" + 1,
            "lastError" = ${String((error as Error).message)},
            "nextAttemptAt" = ${nextAttemptAt}
        WHERE "id" = ${row.id}
      `;
      this.logger.warn(`Outbox row ${row.id} failed to publish`);
    }
  }

  private computeBackoff(attempts: number): number {
    const base = 5000;
    const cap = 5 * 60 * 1000;
    return Math.min(cap, base * Math.pow(2, Math.max(0, attempts)));
  }
}