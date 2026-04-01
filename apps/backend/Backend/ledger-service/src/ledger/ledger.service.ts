import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService }      from '../database/prisma.service.js';
import { BlockchainService }  from '../blockchain/blockchain.service.js';
import { RedisService }       from '../redis/redis.service.js';
import { MintDto }            from './dto/mint.dto.js';
import { TransferDto }        from './dto/transfer.dto.js';
import { LedgerQueryDto }     from './dto/ledger-query.dto.js';

const STREAM = 'ledger-events';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly prisma:      PrismaService,
    private readonly blockchain:  BlockchainService,
    private readonly redis:       RedisService,
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

    // 1. Criar entrada PENDING
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        userId:    dto.userId,
        walletAddr: dto.walletAddress,
        amount:    dto.amount,
        operation: 'MINT',
        ref:       dto.ref ?? `mint:${dto.userId}`,
        status:    'PENDING',
      },
    });

    try {
      // 2. Executar on-chain
      const txHash = await this.blockchain.mint(
        dto.walletAddress, dto.amount, entry.id,
      );

      // 3. Confirmar entrada
      const tx = await this.blockchain.getTransaction(txHash);
      const confirmed = await this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data:  {
          txHash,
          status:      'CONFIRMED',
          blockNumber: tx?.blockNumber,
        },
      });

      await this.redis.publish(STREAM, 'ledger.mint.confirmed', {
        entryId: confirmed.id,
        userId:  dto.userId,
        amount:  dto.amount,
        txHash,
        blockNumber: tx?.blockNumber,
        sourceTransactionId,
      });

      return confirmed;
    } catch (err: any) {
      await this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data:  { status: 'FAILED', metadata: { error: err.message } },
      });

      await this.redis.publish(STREAM, 'ledger.mint.failed', {
        entryId: entry.id,
        userId: dto.userId,
        amount: dto.amount,
        walletAddress: dto.walletAddress,
        sourceTransactionId,
        error: err.message,
      });
      throw err;
    }
  }

  // ─── Transfer ────────────────────────────────────────────

  async transfer(fromUserId: string, dto: TransferDto) {
    const fromAddr = await this.getWalletAddress(fromUserId);

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        userId:    fromUserId,
        walletAddr: fromAddr,
        amount:    dto.amount,
        operation: 'TRANSFER',
        ref:       `transfer:${fromUserId}→${dto.toAddress}`,
        status:    'PENDING',
        metadata:  { toAddress: dto.toAddress },
      },
    });

    try {
      const txHash = await this.blockchain.transfer(dto.toAddress, dto.amount);
      const tx     = await this.blockchain.getTransaction(txHash);

      const confirmed = await this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data:  { txHash, status: 'CONFIRMED', blockNumber: tx?.blockNumber },
      });

      await this.redis.publish(STREAM, 'ledger.transfer.confirmed', {
        entryId:   confirmed.id,
        fromUserId,
        toAddress: dto.toAddress,
        amount:    dto.amount,
        txHash,
      });

      return confirmed;
    } catch (err: any) {
      await this.prisma.ledgerEntry.update({
        where: { id: entry.id },
        data:  { status: 'FAILED', metadata: { error: err.message } },
      });
      throw err;
    }
  }

  // ─── Balance ─────────────────────────────────────────────

  async getBalance(userId: string) {
    const walletAddr = await this.getWalletAddress(userId);
    const [onChain, supply] = await Promise.all([
      this.blockchain.getBalance(walletAddr),
      this.blockchain.getTotalSupply(),
    ]);
    return { userId, walletAddr, balance: onChain, totalSupply: supply };
  }

  async getBalanceByAddress(walletAddr: string) {
    const balance = await this.blockchain.getBalance(walletAddr);
    return { walletAddr, balance };
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
      this.blockchain.getTransaction(txHash),
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

  private extractSourceTransactionId(ref?: string): string | undefined {
    if (!ref) return undefined;
    const prefix = 'wallet.deposit:';
    if (!ref.startsWith(prefix)) return undefined;
    const txId = ref.slice(prefix.length).trim();
    return txId || undefined;
  }
}