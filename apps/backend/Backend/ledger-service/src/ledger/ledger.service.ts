import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService }      from '../database/prisma.service.js';
import { RedisService }       from '../redis/redis.service.js';
import { LEDGER_ADAPTER_TOKEN, LedgerAdapter } from '../ledger-adapters/ledger-adapter.interface.js';
import { MintDto }            from './dto/mint.dto.js';
import { TransferDto }        from './dto/transfer.dto.js';
import { LedgerQueryDto }     from './dto/ledger-query.dto.js';

const STREAM = 'ledger-events';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private readonly submissionMode = String(process.env.LEDGER_SUBMISSION_MODE ?? 'sync').toLowerCase();

  constructor(
    private readonly prisma:      PrismaService,
    private readonly redis:       RedisService,
    @Inject(LEDGER_ADAPTER_TOKEN) private readonly adapter: LedgerAdapter,
  ) {}

  // ─── Wallet Mapping ──────────────────────────────────────

  async registerWallet(userId: string, walletAddr: string) {
    return this.prisma.walletMapping.upsert({
      where:  { userId },
      update: { walletAddr },
      create: { userId, walletAddr },
    });
  }

  async getWalletAddress(userId: string): Promise<string> {
    const m = await this.prisma.walletMapping.findUnique({ where: { userId } });
    if (!m) throw new NotFoundException(`No wallet registered for userId=${userId}`);
    return m.walletAddr;
  }

  // ─── Mint ────────────────────────────────────────────────

  async mint(dto: MintDto) {
    await this.registerWallet(dto.userId, dto.walletAddress);
    const sourceTransactionId = this.extractSourceTransactionId(dto.ref);
    const ref = dto.ref ?? `mint:${dto.userId}`;
    const idempotencyKey = this.buildIdempotencyKey('MINT', dto.userId, ref, sourceTransactionId);

    const existing = await this.prisma.ledgerEntry.findFirst({
      where: { userId: dto.userId, operation: 'MINT', ref, amount: dto.amount },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    // 1. Criar entrada QUEUED
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        userId:    dto.userId,
        walletAddr: dto.walletAddress,
        amount:    dto.amount,
        operation: 'MINT',
        ref,
        status:    'QUEUED',
        metadata:  {
          idempotencyKey,
          sourceTransactionId,
          submissionMode: this.submissionMode,
          provider: this.adapter.network,
        },
      },
    });

    if (this.submissionMode === 'async') {
      await this.enqueueLedgerOutboxEvent('ledger-events', 'ledger.command.submit', {
        entryId: entry.id,
        operation: 'MINT',
        userId: dto.userId,
        walletAddress: dto.walletAddress,
        amount: dto.amount,
        ref,
        idempotencyKey,
        sourceTransactionId,
      }, `submit:${entry.id}`);

      return entry;
    }

    try {
      const result = await this.adapter.mint(
        {
          toAddress: dto.walletAddress,
          amountAtomic: dto.amount.toString(),
          reference: entry.id,
        },
        {
          correlationId: idempotencyKey,
          idempotencyKey,
          sourceTransactionId,
          requestedBy: dto.userId,
          metadata: { ref },
        },
      );

      const metadata = {
        ...(entry.metadata as Record<string, unknown> || {}),
        adapterResult: result,
        confirmedAt: result.status === 'CONFIRMED' ? new Date().toISOString() : undefined,
      };

      if (result.status === 'CONFIRMED' && result.txHash) {
        const tx = await this.adapter.getTransaction(result.txHash);
        const confirmed = await this.prisma.ledgerEntry.update({
          where: { id: entry.id },
          data:  {
            txHash: result.txHash,
            status:      'CONFIRMED',
            blockNumber: tx?.blockOrLedgerIndex,
            metadata,
          },
        });

        await this.enqueueLedgerOutboxEvent('ledger-events', 'ledger.mint.confirmed', {
          entryId: confirmed.id,
          userId:  dto.userId,
          amount:  dto.amount,
          txHash: result.txHash,
          blockNumber: tx?.blockOrLedgerIndex,
          sourceTransactionId,
        }, `mint:confirmed:${confirmed.id}`);

        return confirmed;
      }

      return this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data: {
          status: result.status === 'SUBMITTED' ? 'SUBMITTED' : 'QUEUED',
          metadata,
        },
      });
    } catch (err: any) {
      await this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data:  { status: 'FAILED', metadata: { error: err.message, idempotencyKey, sourceTransactionId, provider: this.adapter.network } },
      });

      await this.enqueueLedgerOutboxEvent('ledger-events', 'ledger.mint.failed', {
        entryId: entry.id,
        userId: dto.userId,
        amount: dto.amount,
        walletAddress: dto.walletAddress,
        sourceTransactionId,
        error: err.message,
      }, `mint:failed:${entry.id}`);
      throw err;
    }
  }

  // ─── Transfer ────────────────────────────────────────────

  async transfer(fromUserId: string, dto: TransferDto) {
    const fromAddr = await this.getWalletAddress(fromUserId);
    const ref = `transfer:${fromUserId}→${dto.toAddress}`;
    const idempotencyKey = this.buildIdempotencyKey('TRANSFER', fromUserId, ref);

    const existing = await this.prisma.ledgerEntry.findFirst({
      where: { userId: fromUserId, operation: 'TRANSFER', ref, amount: dto.amount },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        userId:    fromUserId,
        walletAddr: fromAddr,
        amount:    dto.amount,
        operation: 'TRANSFER',
        ref,
        status:    'QUEUED',
        metadata:  { toAddress: dto.toAddress, idempotencyKey, provider: this.adapter.network },
      },
    });

    if (this.submissionMode === 'async') {
      await this.enqueueLedgerOutboxEvent('ledger-events', 'ledger.command.submit', {
        entryId: entry.id,
        operation: 'TRANSFER',
        fromUserId,
        fromAddress: fromAddr,
        toAddress: dto.toAddress,
        amount: dto.amount,
        ref,
        idempotencyKey,
      }, `submit:${entry.id}`);

      return entry;
    }

    try {
      const result = await this.adapter.transfer(
        {
          fromAddress: fromAddr,
          toAddress: dto.toAddress,
          amountAtomic: dto.amount.toString(),
          reference: ref,
        },
        {
          correlationId: idempotencyKey,
          idempotencyKey,
          requestedBy: fromUserId,
          metadata: { fromAddr, toAddress: dto.toAddress },
        },
      );
      const metadata = {
        ...(entry.metadata as Record<string, unknown> || {}),
        adapterResult: result,
        confirmedAt: result.status === 'CONFIRMED' ? new Date().toISOString() : undefined,
      };

      if (result.status === 'CONFIRMED' && result.txHash) {
        const tx = await this.adapter.getTransaction(result.txHash);
        const confirmed = await this.prisma.ledgerEntry.update({
          where: { id: entry.id },
          data:  {
            txHash: result.txHash,
            status: 'CONFIRMED',
            blockNumber: tx?.blockOrLedgerIndex,
            metadata,
          },
        });

        await this.enqueueLedgerOutboxEvent('ledger-events', 'ledger.transfer.confirmed', {
          entryId:   confirmed.id,
          fromUserId,
          toAddress: dto.toAddress,
          amount:    dto.amount,
          txHash: result.txHash,
          blockNumber: tx?.blockOrLedgerIndex,
        }, `transfer:confirmed:${confirmed.id}`);

        return confirmed;
      }

      return this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data: {
          status: result.status === 'SUBMITTED' ? 'SUBMITTED' : 'QUEUED',
          metadata,
        },
      });
    } catch (err: any) {
      await this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data:  { status: 'FAILED', metadata: { error: err.message, idempotencyKey, provider: this.adapter.network } },
      });
      await this.enqueueLedgerOutboxEvent('ledger-events', 'ledger.transfer.failed', {
        entryId: entry.id,
        fromUserId,
        toAddress: dto.toAddress,
        amount: dto.amount,
        error: err.message,
      }, `transfer:failed:${entry.id}`);
      throw err;
    }
  }

  // ─── Balance ─────────────────────────────────────────────

  async getBalance(userId: string) {
    const walletAddr = await this.getWalletAddress(userId);
    const [onChain, supply] = await Promise.all([
      this.adapter.getBalance(walletAddr),
      this.adapter.getTotalSupply(),
    ]);
    return { userId, walletAddr, balance: onChain.balanceDisplay, totalSupply: supply.totalSupplyDisplay, provider: onChain.network };
  }

  async getBalanceByAddress(walletAddr: string) {
    const balance = await this.adapter.getBalance(walletAddr);
    return { walletAddr, balance: balance.balanceDisplay, provider: balance.network };
  }

  // ─── History ─────────────────────────────────────────────

  async getHistory(userId: string, query: LedgerQueryDto) {
    const { operation, page = 1, limit = 20 } = query;
    const skip  = (page - 1) * limit;
    const where: any = { userId };
    if (operation) where.operation = operation;

    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return { data: entries, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getTransaction(txHash: string) {
    const [entry, onChain] = await Promise.all([
      this.prisma.ledgerEntry.findUnique({ where: { txHash } }),
      this.adapter.getTransaction(txHash),
    ]);
    if (!entry) throw new NotFoundException('Transaction not found in ledger');
    return { ...entry, onChain };
  }

  // ─── Event handler (chamado pelo EventConsumerService) ───

  async handleWalletDeposit(payload: { userId: string; amount: number; transactionId: string }) {
    const mapping = await this.prisma.walletMapping.findUnique({ where: { userId: payload.userId } });
    if (!mapping) {
      this.logger.warn(`No wallet mapping for userId=${payload.userId} — skipping mint`);
      return;
    }

    await this.mint({
      userId:        payload.userId,
      walletAddress: mapping.walletAddr,
      amount:        payload.amount,
      ref:           `wallet.deposit:${payload.transactionId}`,
    });
  }

  async enqueueLedgerOutboxEvent(stream: string, event: string, payload: Record<string, unknown>, dedupeKey: string) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "LedgerOutbox" ("id", "stream", "event", "payload", "dedupeKey", "status", "attempts", "createdAt")
        VALUES (${randomUUID()}, ${stream}, ${event}, ${JSON.stringify(payload)}::jsonb, ${dedupeKey}, 'PENDING', 0, NOW())
        ON CONFLICT ("dedupeKey") DO NOTHING
      `;
    } catch (error) {
      this.logger.warn(`Outbox unavailable for ${event}: ${(error as Error).message}`);
      await this.redis.publish(stream, event, payload);
    }
  }

  private buildIdempotencyKey(operation: 'MINT' | 'TRANSFER' | 'BURN', userId: string, ref: string, sourceTransactionId?: string | undefined) {
    return [operation, userId, ref, sourceTransactionId ?? ''].filter(Boolean).join(':');
  }

  private isAsyncSubmissionEnabled(): boolean {
    return this.submissionMode === 'async';
  }

  private extractSourceTransactionId(ref?: string): string | undefined {
    if (!ref) return undefined;
    const prefix = 'wallet.deposit:';
    if (!ref.startsWith(prefix)) return undefined;
    const txId = ref.slice(prefix.length).trim();
    return txId || undefined;
  }
}