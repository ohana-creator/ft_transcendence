import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { LedgerAdapter } from '../ledger-adapters/ledger-adapter.interface.js';

type LedgerRow = {
  id: string;
  userId: string;
  walletAddr: string;
  operation: string;
  amount: number;
  ref: string | null;
  status: string;
  txHash: string | null;
  blockNumber: number | null;
  metadata: any;
  sourceTransactionId?: string | null;
  idempotencyKey?: string | null;
  nextRetryAt?: Date | null;
  submitAttempts?: number;
};

@Injectable()
export class ReconciliationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationWorker.name);
  private running = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly adapter: LedgerAdapter,
  ) {}

  async onModuleInit() {
    if (String(process.env.LEDGER_RECONCILIATION_ENABLED ?? 'false') === 'false') {
      this.logger.warn('Reconciliation worker disabled by LEDGER_RECONCILIATION_ENABLED=false');
      return;
    }

    this.running = true;
    this.timer = setInterval(
      () => void this.reconcileLoop(),
      Number(process.env.LEDGER_RECONCILIATION_INTERVAL_MS ?? 5000),
    );
    void this.reconcileLoop();
  }

  async onModuleDestroy() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
  }

  private async reconcileLoop() {
    if (!this.running) return;

    try {
      const batchSize = Number(process.env.LEDGER_RECONCILIATION_BATCH_SIZE ?? 25);
      const rows = await this.prisma.$queryRaw<LedgerRow[]>`
        SELECT "id", "userId", "walletAddr", "operation", "amount", "ref", "status", "txHash", "blockNumber", "metadata", "sourceTransactionId", "idempotencyKey", "nextRetryAt", "submitAttempts"
        FROM "LedgerEntry"
        WHERE "status" IN ('QUEUED', 'SUBMITTED', 'FAILED')
          AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
      `;

      for (const row of rows) {
        await this.reconcileRow(row);
      }
    } catch (error) {
      this.logger.warn(`Reconciliation scan failed: ${(error as Error).message}`);
    }
  }

  private async reconcileRow(row: LedgerRow) {
    try {
      if (!row.txHash) {
        const submitResult = await this.submitPendingRow(row);
        if (submitResult.status !== 'CONFIRMED' || !submitResult.txHash) {
          await this.prisma.$executeRaw`
            UPDATE "LedgerEntry"
            SET "submitAttempts" = COALESCE("submitAttempts", 0) + 1,
                "nextRetryAt" = NOW() + INTERVAL '30 seconds'
            WHERE "id" = ${row.id}
          `;
          return;
        }
        row.txHash = submitResult.txHash;
      }

      if (row.txHash) {
        const tx = await this.adapter.getTransaction(row.txHash);
        if (tx.status === 'CONFIRMED') {
          await this.prisma.$executeRaw`
            UPDATE "LedgerEntry"
            SET "status" = 'CONFIRMED',
                "blockNumber" = ${tx.blockOrLedgerIndex ?? null},
                "confirmedAt" = NOW(),
                "nextRetryAt" = NULL
            WHERE "id" = ${row.id}
          `;

          await this.enqueueOutbox('ledger-events', this.eventName(row.operation, 'confirmed'), {
            entryId: row.id,
            userId: row.userId,
            amount: row.amount,
            walletAddress: row.walletAddr,
            txHash: row.txHash,
            blockNumber: tx.blockOrLedgerIndex ?? null,
            sourceTransactionId: row.sourceTransactionId ?? null,
            idempotencyKey: row.idempotencyKey ?? null,
          }, `reconcile:confirmed:${row.id}`);
          return;
        }
      }

      await this.prisma.$executeRaw`
        UPDATE "LedgerEntry"
        SET "submitAttempts" = COALESCE("submitAttempts", 0) + 1,
            "nextRetryAt" = NOW() + INTERVAL '30 seconds'
        WHERE "id" = ${row.id}
      `;

      await this.enqueueOutbox('ledger-events', 'ledger.reconciliation.pending', {
        entryId: row.id,
        operation: row.operation,
        status: row.status,
        walletAddress: row.walletAddr,
        sourceTransactionId: row.sourceTransactionId ?? null,
        idempotencyKey: row.idempotencyKey ?? null,
      }, `reconcile:pending:${row.id}`);
    } catch (error) {
      await this.prisma.$executeRaw`
        UPDATE "LedgerEntry"
        SET "status" = 'FAILED',
            "submitAttempts" = COALESCE("submitAttempts", 0) + 1,
            "nextRetryAt" = NOW() + INTERVAL '1 minute'
        WHERE "id" = ${row.id}
      `;
      this.logger.warn(`Reconciliation failed for entry ${row.id}: ${(error as Error).message}`);
    }
  }

  private async submitPendingRow(row: LedgerRow) {
    const context = {
      correlationId: row.idempotencyKey ?? row.id,
      idempotencyKey: row.idempotencyKey ?? row.id,
      sourceTransactionId: row.sourceTransactionId ?? undefined,
      requestedBy: row.userId,
      metadata: row.metadata ?? {},
    };

    if (row.operation === 'TRANSFER') {
      return this.adapter.transfer(
        {
          fromAddress: row.walletAddr,
          toAddress: (row.metadata?.toAddress as string) ?? row.walletAddr,
          amountAtomic: String(row.amount),
          reference: row.ref ?? row.id,
        },
        context,
      );
    }

    if (row.operation === 'BURN') {
      return this.adapter.burn(
        {
          fromAddress: row.walletAddr,
          amountAtomic: String(row.amount),
          reference: row.ref ?? row.id,
        },
        context,
      );
    }

    return this.adapter.mint(
      {
        toAddress: row.walletAddr,
        amountAtomic: String(row.amount),
        reference: row.ref ?? row.id,
      },
      context,
    );
  }

  private async enqueueOutbox(
    stream: string,
    event: string,
    payload: Record<string, unknown>,
    dedupeKey: string,
  ) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "LedgerOutbox" ("id", "stream", "event", "payload", "dedupeKey", "status", "attempts", "createdAt")
        VALUES (${randomUUID()}, ${stream}, ${event}, ${JSON.stringify(payload)}::jsonb, ${dedupeKey}, 'PENDING', 0, NOW())
        ON CONFLICT ("dedupeKey") DO NOTHING
      `;
    } catch (error) {
      this.logger.warn(`Failed to enqueue outbox event ${event}: ${(error as Error).message}`);
      await this.redis.publish(stream, event, payload);
    }
  }

  private eventName(operation: string, suffix: 'confirmed' | 'failed'): string {
    if (operation === 'TRANSFER') return `ledger.transfer.${suffix}`;
    if (operation === 'BURN') return `ledger.burn.${suffix}`;
    return `ledger.mint.${suffix}`;
  }
}