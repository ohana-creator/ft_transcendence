import { Module } from '@nestjs/common';
import { LedgerAdaptersModule } from '../ledger-adapters/ledger-adapters.module.js';
import { PrismaModule } from '../database/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { OutboxPublisherWorker } from './outbox-publisher.worker.js';
import { ReconciliationWorker } from './reconciliation.worker.js';

@Module({
  imports: [LedgerAdaptersModule, PrismaModule, RedisModule],
  providers: [OutboxPublisherWorker, ReconciliationWorker],
})
export class WorkersModule {}