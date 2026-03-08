import { PrismaService } from "src/database/prisma.service";
import { Wallet } from "generated/prisma/client";
import { RedisService } from "src/redis/redis.service";
import { UnauthorizedException,
    NotFoundException,
    BadRequestException,
    Injectable,
    Logger } from "@nestjs/common";
import { TransferDto } from "./dto/transfer.dto";
import { DepositDto } from "./dto/deposit.dto";
import { TransactionsQueryDto } from "./dto/transactions-query.dto";

const STREAM = 'wallet-events';

@Injectable()
export class WalletService
{
    private readonly logger = new Logger(WalletService.name);

    constructor(
        private readonly conn: PrismaService,
        private readonly redis: RedisService,
    )
    {}

    async createWallet(userId: string, initialBalance: number = 0)
    {
        const existing = await this.conn.wallet.findUnique({ where: { userId } });
        if (existing)
        {
            this.logger.warn(`Wallet already exists for userId=${userId}`);
            return (existing);
        }

        const wallet = await this.conn.wallet.create({
        data: { userId, balance: initialBalance },
        });

        this.logger.log(`Wallet created for userId=${userId}`);
        return (wallet);
    }

    async getWalletByUserId(userId: string)
    {
        const wallet = await this.conn.wallet.findUnique({ where: { userId } });
        if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
        return (wallet);
    }

    async getBalance(userId: string)
    {
        const wallet = await this.getWalletByUserId(userId);
        return ({ balance: wallet.balance });
    }

    async transfer(fromUserId: string, dto: TransferDto)
    {
        const { toUserId, amount, note } = dto;

        if (fromUserId === toUserId) {
            throw new BadRequestException('CANNOT_TRANSFER_TO_SELF');
        }

        try {
            // Transação atómica com isolamento serializable
            const result = await this.conn.$transaction(async (tx) => {
                // 1. Lock pessimista: SELECT FOR UPDATE nas duas wallets
                const [fromWallet] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                fromUserId,
                );
                if (!fromWallet) throw new NotFoundException('SENDER_WALLET_NOT_FOUND');

                const [toWallet] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                toUserId,
                );
                if (!toWallet) throw new NotFoundException('RECIPIENT_WALLET_NOT_FOUND');

                // 2. Verificar saldo
                if (fromWallet.balance < amount)
                {
                    throw new BadRequestException('INSUFFICIENT_FUNDS');
                }

                // 3. Debitar remetente
                await tx.wallet.update({
                where: { id: fromWallet.id },
                data: { balance: { decrement: amount } },
                });

                // 4. Creditar destinatário
                await tx.wallet.update({
                where: { id: toWallet.id },
                data: { balance: { increment: amount } },
                });

                // 5. Criar transação
                const transaction = await tx.transaction.create({
                data: {
                    fromWalletId: fromWallet.id,
                    toWalletId: toWallet.id,
                    amount,
                    type: 'P2P_TRANSFER',
                    status: 'COMPLETED',
                    metadata: note ? { note } : undefined,
                },
                });

                return ({
                    transaction,
                    newBalance: fromWallet.balance - amount,
                });
            }, {
                isolationLevel: 'Serializable',
                timeout: 10000,
            });

            // Publish event for Notification Service
            await this.redis.publish(STREAM, 'wallet.transfer', {
                transactionId: result.transaction.id,
                fromUserId,
                toUserId,
                amount,
            });

            return result;
        } catch (error: unknown) {
            // Registar transação FAILED para erros de negócio (auditoria)
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                const failedTx = await this.recordFailedTransaction(
                    'P2P_TRANSFER', amount, error as Error,
                    { fromUserId, toUserId, note },
                );

                await this.redis.publish(STREAM, 'wallet.transfer.failed', {
                    transactionId: failedTx?.id ?? null,
                    fromUserId,
                    toUserId,
                    amount,
                    reason: error.message,
                });
            }
            throw error;
        }
    }

    // ── Deposit ──────────────────────────────────────────────

    async deposit(userId: string, dto: DepositDto)
    {
        const { amount, note } = dto;

        try {
            const result = await this.conn.$transaction(async (tx) => {
                // 1. Lock pessimista na wallet
                const [wallet] = await tx.$queryRawUnsafe<Wallet[]>(
                    'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                    userId,
                );
                if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');

                // 2. Creditar saldo
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: amount } },
                });

                // 3. Criar transação de depósito
                const transaction = await tx.transaction.create({
                    data: {
                        fromWalletId: null,
                        toWalletId: wallet.id,
                        amount,
                        type: 'DEPOSIT',
                        status: 'COMPLETED',
                        metadata: note ? { note } : undefined,
                    },
                });

                return ({
                    transaction,
                    newBalance: wallet.balance + amount,
                });
            }, {
                isolationLevel: 'Serializable',
                timeout: 10000,
            });

            // Publish event
            await this.redis.publish(STREAM, 'wallet.deposit', {
                transactionId: result.transaction.id,
                userId,
                amount,
            });

            return result;
        } catch (error: unknown) {
            if (error instanceof NotFoundException) {
                const failedTx = await this.recordFailedTransaction(
                    'DEPOSIT', amount, error as Error,
                    { userId, note },
                );

                await this.redis.publish(STREAM, 'wallet.deposit.failed', {
                    transactionId: failedTx?.id ?? null,
                    userId,
                    amount,
                    reason: error.message,
                });
            }
            throw error;
        }
    }

    // ── Audit helper ─────────────────────────────────────────

    /**
     * Regista uma transação com status FAILED fora da transação atómica
     * principal (que fez rollback). Serve como trilho de auditoria.
     */
    private async recordFailedTransaction(
        type: 'P2P_TRANSFER' | 'DEPOSIT' | 'CAMPAIGN_CONTRIBUTION' | 'CAMPAIGN_WITHDRAWAL',
        amount: number,
        error: Error,
        context: Record<string, any>,
    ): Promise<{ id: string } | null>
    {
        try {
            const { fromUserId, toUserId, userId, ...extra } = context;

            const fromWallet = fromUserId
                ? await this.conn.wallet.findUnique({ where: { userId: fromUserId } })
                : null;
            const toWallet = (toUserId || userId)
                ? await this.conn.wallet.findUnique({ where: { userId: toUserId ?? userId } })
                : null;

            // Só registar se conseguimos identificar pelo menos uma wallet
            if (!fromWallet && !toWallet) return null;

            const failedTx = await this.conn.transaction.create({
                data: {
                    fromWalletId: fromWallet?.id ?? null,
                    toWalletId: toWallet?.id ?? null,
                    amount,
                    type,
                    status: 'FAILED',
                    metadata: {
                        ...extra,
                        failReason: error.message,
                    },
                },
            });

            this.logger.warn(
                `Recorded FAILED ${type} transaction: ${error.message}`,
            );

            return failedTx;
        } catch (recordError) {
            // Nunca deixar a gravação de auditoria impedir o fluxo principal
            this.logger.error(`Failed to record audit transaction: ${recordError}`);
            return null;
        }
    }

    async getTransactions(userId: string, query: TransactionsQueryDto)
    {
        const wallet = await this.getWalletByUserId(userId);
        const { page = 1, limit = 10, type } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            OR: [
            { fromWalletId: wallet.id },
            { toWalletId: wallet.id },
            ],
        };

        if (type) {
            where.type = type;
        }

        const [transactions, total] = await Promise.all([
            this.conn.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            }),
            this.conn.transaction.count({ where }),
        ]);

        return {
            data: transactions,
            meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getTransactionById(transactionId: string, userId: string)
    {
        const wallet = await this.getWalletByUserId(userId);
        const transaction = await this.conn.transaction.findFirst({
            where: {
            id: transactionId,
            OR: [
                { fromWalletId: wallet.id },
                { toWalletId: wallet.id },
            ],
            },
        });
        if (!transaction) throw new NotFoundException('TRANSACTION_NOT_FOUND');
        return transaction;
    }

}

