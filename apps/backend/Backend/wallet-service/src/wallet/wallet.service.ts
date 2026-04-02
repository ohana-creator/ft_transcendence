import { PrismaService } from "src/database/prisma.service";
import { Wallet } from "@prisma/client";
import { RedisService } from "src/redis/redis.service";
import { UnauthorizedException,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Injectable,
    Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TransferDto } from "./dto/transfer.dto";
import { DepositDto } from "./dto/deposit.dto";
import { TransactionsQueryDto } from "./dto/transactions-query.dto";
import { CampaignContributeDto } from "./dto/campaign-contribute.dto";
import { TopupDto } from "./dto/topup.dto";
import { ConfirmTopupDto } from "./dto/confirm-topup.dto";
import { randomUUID } from "node:crypto";

const STREAM = 'wallet-events';

type LedgerMintConfirmedPayload = {
    entryId?: string;
    userId?: string;
    amount?: number;
    txHash?: string;
    blockNumber?: number;
    sourceTransactionId?: string;
};

type LedgerMintFailedPayload = {
    entryId?: string;
    userId?: string;
    amount?: number;
    error?: string;
    sourceTransactionId?: string;
};

@Injectable()
export class WalletService
{
    private readonly logger = new Logger(WalletService.name);
    private readonly userServiceUrl?: string;

    constructor(
        private readonly conn: PrismaService,
        private readonly redis: RedisService,
        private readonly config: ConfigService,
    )
    {
        this.userServiceUrl = this.config.get<string>('USER_SERVICE_URL');
    }

    async createWallet(userId: string, initialBalance: number = 0)
    {
        const wallet = await this.conn.wallet.upsert({
            where: { userId },
            update: {},  // se já existe, não altera nada
            create: { userId, balance: initialBalance },
        });

        this.logger.log(`Wallet ensured for userId=${userId}`);
        return (wallet);
    }

    // ── Campaign Wallet Lifecycle ─────────────────────────────

    async createCampaignWallet(campaignId: string)
    {
        const wallet = await this.conn.wallet.upsert({
            where: { campaignId },
            update: {},
            create: { campaignId, balance: 0 },
        });

        this.logger.log(`Campaign wallet ensured for campaignId=${campaignId}`);
        return (wallet);
    }

    async deleteCampaignWallet(campaignId: string)
    {
        const wallet = await this.conn.wallet.findUnique({ where: { campaignId } });
        if (!wallet)
        {
            this.logger.warn(`No campaign wallet found for campaignId=${campaignId} — skipping`);
            return;
        }

        await this.conn.wallet.delete({ where: { id: wallet.id } });
        this.logger.log(`Campaign wallet deleted for campaignId=${campaignId}`);
    }

    async getWalletByUserId(userId: string)
    {
        const wallet = await this.ensureWallet(userId);
        return {
            ...wallet,
            balance: wallet.balance.toString(),
        };
    }

    async getBalance(userId: string)
    {
        const wallet = await this.getWalletByUserId(userId);
        return ({ balance: wallet.balance.toString(), currency: 'VAKS' });
    }

    async transfer(fromUser: { userId: string; username?: string }, dto: TransferDto | Record<string, unknown>)
    {
        const fromUserId = fromUser.userId;
        const payload = dto as Record<string, unknown>;
        const rawAmount = payload.amount;
        const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
        const note = typeof payload.note === 'string' ? payload.note : undefined;
        const recipientIdentifier = this.extractRecipientIdentifier(payload);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException('INVALID_AMOUNT');
        }

        if (!recipientIdentifier) {
            throw new BadRequestException('RECIPIENT_REQUIRED');
        }

        // Resolver identifier (UUID, email ou username) em userId
        const toUserId = await this.resolveUserIdentifier(recipientIdentifier);

        if (fromUserId === toUserId) {
            const current = await this.getBalance(fromUserId);
            return {
                transaction: null,
                newBalance: Number(current.balance),
                ignored: true,
                reason: 'CANNOT_TRANSFER_TO_SELF',
            };
        }

        await this.ensureWallet(fromUserId);
        const recipientProfile = await this.getUserProfile(toUserId);
        const toUsername = recipientProfile?.username ?? toUserId;
        const fromUsername = fromUser.username ?? fromUserId;

        try {
            // Transação atómica com isolamento serializable
            const result = await this.conn.$transaction(async (tx) => {
                // 1. Lock pessimista: SELECT FOR UPDATE — order by userId to prevent deadlock
                const [first, second] = [fromUserId, toUserId].sort();
                const wallets = new Map<string, Wallet>();

                const [w1] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                first,
                );
                if (!w1) throw new NotFoundException(first === fromUserId ? 'SENDER_WALLET_NOT_FOUND' : 'RECIPIENT_WALLET_NOT_FOUND');
                wallets.set(first, w1);

                const [w2] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                second,
                );
                if (!w2) throw new NotFoundException(second === fromUserId ? 'SENDER_WALLET_NOT_FOUND' : 'RECIPIENT_WALLET_NOT_FOUND');
                wallets.set(second, w2);

                const fromWallet = wallets.get(fromUserId)!;
                const toWallet = wallets.get(toUserId)!;

                // 2. Verificar saldo
                if (Number(fromWallet.balance) < amount)
                {
                    throw new ConflictException('INSUFFICIENT_FUNDS');
                }

                // 3. Debitar remetente
                const updatedFromWallet = await tx.wallet.update({
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
                    metadata: {
                        note: note ?? null,
                        fromUserId,
                        toUserId,
                        fromUsername,
                        toUsername,
                    },
                },
                });

                return ({
                    transaction,
                    newBalance: Number(updatedFromWallet.balance),
                });
            }, {
                isolationLevel: 'Serializable',
                timeout: 10000,
            });

            // Publish event for Notification Service
            await this.redis.publish(STREAM, 'transfer.completed', {
                transactionId: result.transaction.id,
                fromUserId,
                toUserId,
                fromUsername,
                toUsername,
                amount,
            });

            return result;
        } catch (error: unknown) {
            // Registar transação FAILED para erros de negócio (auditoria)
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                const failedTx = await this.recordFailedTransaction(
                    'P2P_TRANSFER', amount, error as Error,
                    { fromUserId, toUserId, note, fromUsername, toUsername },
                );

                await this.redis.publish(STREAM, 'transfer.failed', {
                    transactionId: failedTx?.id ?? null,
                    fromUserId,
                    toUserId,
                    fromUsername,
                    toUsername,
                    amount,
                    reason: error.message,
                });
            }
            throw error;
        }
    }

    async topup(userId: string, dto: TopupDto)
    {
        const maxTopupAmount = 1_000_000;

        if (dto.amount > maxTopupAmount) {
            return {
                status: 'REJECTED',
                code: 'TOPUP_AMOUNT_EXCEEDED',
                message: `Valor maximo permitido: ${maxTopupAmount}`,
                maxAmount: maxTopupAmount,
                requestedAmount: dto.amount,
            };
        }

        const mode = dto.mode ?? 'checkout';
        const provider = dto.provider ?? 'mock';

        if (mode === 'instant') {
            const note = dto.note ?? `topup:${provider}:instant`;
            const result = await this.deposit(userId, { amount: dto.amount, note });

            return {
                status: 'COMPLETED',
                data: result,
            };
        }

        const reference = randomUUID();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const frontendUrl = (this.config.get<string>('FRONTEND_URL') ?? 'https://localhost:3001').replace(/\/$/, '');
        const configuredCheckoutPath = this.config.get<string>('TOPUP_CHECKOUT_PATH') ?? '/carteira/carregar';
        const checkoutPath = configuredCheckoutPath.startsWith('/')
            ? configuredCheckoutPath
            : `/${configuredCheckoutPath}`;

        if (provider === 'mock') {
            // In local/dev the mock provider has no external webhook.
            // Auto-confirm after a short delay so the wallet is actually credited.
            setTimeout(() => {
                void this.confirmTopup({
                    userId,
                    amount: dto.amount,
                    reference,
                    note: dto.note ?? `topup:checkout:${reference}:mock-auto-confirmed`,
                })
                    .then(() => {
                        this.logger.log(`Mock checkout topup auto-confirmed for userId=${userId} ref=${reference}`);
                    })
                    .catch((error: unknown) => {
                        const message = error instanceof Error ? error.message : String(error);
                        this.logger.error(`Failed to auto-confirm mock topup ref=${reference}: ${message}`);
                    });
            }, 1500);
        }

        return {
            status: 'PENDING',
            provider,
            reference,
            amount: dto.amount,
            currency: 'VAKS',
            checkoutUrl: `${frontendUrl}${checkoutPath}?ref=${encodeURIComponent(reference)}`,
            expiresAt,
            nextAction: 'Confirm payment externally, then call internal confirm endpoint with API key',
        };
    }

    async confirmTopup(dto: ConfirmTopupDto)
    {
        const note = dto.note ?? `topup:checkout:${dto.reference}`;
        const result = await this.deposit(dto.userId, { amount: dto.amount, note });

        return {
            status: 'COMPLETED',
            reference: dto.reference,
            data: result,
        };
    }

    // ── Deposit ──────────────────────────────────────────────

    async deposit(userId: string, dto: DepositDto)
    {
        const { amount, note } = dto;
        await this.ensureWallet(userId);

        try {
            const result = await this.conn.$transaction(async (tx) => {
                // 1. Lock pessimista na wallet
                const [wallet] = await tx.$queryRawUnsafe<Wallet[]>(
                    'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                    userId,
                );
                if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');

                // 2. Creditar saldo
                const updatedWallet = await tx.wallet.update({
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
                    newBalance: Number(updatedWallet.balance),
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

    // ── Ledger Reconciliation ───────────────────────────────

    async markDepositOnChainConfirmed(payload: LedgerMintConfirmedPayload)
    {
        const transactionId = payload.sourceTransactionId;
        if (!transactionId)
        {
            this.logger.warn('ledger.mint.confirmed received without sourceTransactionId');
            return;
        }

        const transaction = await this.conn.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction)
        {
            this.logger.warn(`Transaction ${transactionId} not found for on-chain confirmation`);
            return;
        }

        if (transaction.type !== 'DEPOSIT')
        {
            this.logger.warn(`Ignoring ledger confirmation for non-deposit transaction ${transactionId}`);
            return;
        }

        if (transaction.status === 'REVERSED')
        {
            this.logger.warn(`Ignoring ledger confirmation for reversed transaction ${transactionId}`);
            return;
        }

        const metadata = this.mergeMetadata(transaction.metadata, {
            onChain: {
                status: 'CONFIRMED',
                ledgerEntryId: payload.entryId,
                txHash: payload.txHash,
                blockNumber: payload.blockNumber,
                confirmedAt: new Date().toISOString(),
            },
        });

        await this.conn.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'COMPLETED',
                metadata,
            },
        });
    }

    async compensateFailedOnChainMint(payload: LedgerMintFailedPayload)
    {
        const transactionId = payload.sourceTransactionId;
        if (!transactionId)
        {
            this.logger.warn('ledger.mint.failed received without sourceTransactionId');
            return;
        }

        const transaction = await this.conn.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction)
        {
            this.logger.warn(`Transaction ${transactionId} not found for on-chain compensation`);
            return;
        }

        if (transaction.type !== 'DEPOSIT')
        {
            this.logger.warn(`Ignoring ledger failure for non-deposit transaction ${transactionId}`);
            return;
        }

        if (transaction.status === 'REVERSED')
        {
            this.logger.log(`Transaction ${transactionId} already reversed`);
            return;
        }

        if (!transaction.toWalletId)
        {
            this.logger.error(`Deposit transaction ${transactionId} has no target wallet`);
            return;
        }

        const amount = Number(transaction.amount);

        await this.conn.$transaction(async (tx) => {
            const [wallet] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "id" = $1 FOR UPDATE',
                transaction.toWalletId,
            );

            if (!wallet)
            {
                throw new NotFoundException('WALLET_NOT_FOUND_FOR_COMPENSATION');
            }

            const baseMetadata = this.mergeMetadata(transaction.metadata, {
                onChain: {
                    status: 'FAILED',
                    ledgerEntryId: payload.entryId,
                    failReason: payload.error ?? 'UNKNOWN_BLOCKCHAIN_ERROR',
                    failedAt: new Date().toISOString(),
                },
            });

            if (Number(wallet.balance) < amount)
            {
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'FAILED',
                        metadata: this.mergeMetadata(baseMetadata, {
                            compensationPending: true,
                            compensationReason: 'INSUFFICIENT_LOCAL_BALANCE',
                        }),
                    },
                });

                this.logger.error(
                    `Could not auto-compensate transaction ${transaction.id}: insufficient local balance`,
                );
                return;
            }

            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });

            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'REVERSED',
                    metadata: this.mergeMetadata(baseMetadata, {
                        compensationApplied: true,
                        reversedAt: new Date().toISOString(),
                    }),
                },
            });
        }, {
            isolationLevel: 'Serializable',
            timeout: 10000,
        });

        await this.redis.publish(STREAM, 'wallet.deposit.reversed', {
            transactionId,
            userId: payload.userId,
            amount,
            reason: payload.error ?? 'BLOCKCHAIN_MINT_FAILED',
        });
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

    // ── Campaign Contribution ─────────────────────────────────

    /**
     * Chamado internamente pelo Campaign Service via REST.
     * Debita o saldo do utilizador e cria uma transação CAMPAIGN_CONTRIBUTION.
     */
    async contributeToCampaign(dto: CampaignContributeDto)
    {
        const { userId, campaignId, amount, campaignTitle } = dto;
        await this.ensureWallet(userId);

        try {
            const result = await this.conn.$transaction(async (tx) => {
                // 1. Lock pessimista nas duas wallets (ordenar para evitar deadlock)
                const [userWallet] = await tx.$queryRawUnsafe<Wallet[]>(
                    'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                    userId,
                );
                if (!userWallet) throw new NotFoundException('WALLET_NOT_FOUND');

                const [campaignWallet] = await tx.$queryRawUnsafe<Wallet[]>(
                    'SELECT * FROM "Wallet" WHERE "campaignId" = $1 FOR UPDATE',
                    campaignId,
                );
                if (!campaignWallet) throw new NotFoundException('CAMPAIGN_WALLET_NOT_FOUND');

                // 2. Verificar saldo
                if (Number(userWallet.balance) < amount) {
                    throw new ConflictException('INSUFFICIENT_FUNDS');
                }

                // 3. Debitar utilizador
                const updatedUserWallet = await tx.wallet.update({
                    where: { id: userWallet.id },
                    data: { balance: { decrement: amount } },
                });

                // 4. Creditar carteira da campanha
                await tx.wallet.update({
                    where: { id: campaignWallet.id },
                    data: { balance: { increment: amount } },
                });

                // 5. Criar transação
                const transaction = await tx.transaction.create({
                    data: {
                        fromWalletId: userWallet.id,
                        toWalletId: campaignWallet.id,
                        amount,
                        type: 'CAMPAIGN_CONTRIBUTION',
                        status: 'COMPLETED',
                        metadata: { campaignId, campaignTitle: campaignTitle ?? null },
                    },
                });

                return {
                    transaction,
                    newBalance: Number(updatedUserWallet.balance),
                };
            }, {
                isolationLevel: 'Serializable',
                timeout: 10000,
            });

            await this.redis.publish(STREAM, 'contribution.completed', {
                transactionId: result.transaction.id,
                userId,
                campaignId,
                amount,
            });

            return result;
        } catch (error: unknown) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                await this.recordFailedTransaction(
                    'CAMPAIGN_CONTRIBUTION', amount, error as Error,
                    { fromUserId: userId, campaignId, campaignTitle },
                );
            }
            throw error;
        }
    }

    // ── Campaign Refund (Saga Compensation) ──────────────────

    /**
     * Reverts a campaign contribution — called when the Campaign Service
     * fails to update its local DB after the Wallet debit succeeded.
     * Re-credits the user's wallet and creates a REVERSED transaction.
     */
    async refundContribution(dto: CampaignContributeDto)
    {
        const { userId, campaignId, amount, campaignTitle } = dto;

        const result = await this.conn.$transaction(async (tx) => {
            // 1. Lock pessimista nas duas wallets
            const [userWallet] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
                userId,
            );
            if (!userWallet) throw new NotFoundException('WALLET_NOT_FOUND');

            const [campaignWallet] = await tx.$queryRawUnsafe<Wallet[]>(
                'SELECT * FROM "Wallet" WHERE "campaignId" = $1 FOR UPDATE',
                campaignId,
            );
            if (!campaignWallet) throw new NotFoundException('CAMPAIGN_WALLET_NOT_FOUND');

            // 2. Verificar saldo da carteira da campanha
            if (Number(campaignWallet.balance) < amount) {
                throw new BadRequestException('CAMPAIGN_INSUFFICIENT_FUNDS');
            }

            // 3. Debitar campanha
            await tx.wallet.update({
                where: { id: campaignWallet.id },
                data: { balance: { decrement: amount } },
            });

            // 4. Creditar utilizador
            const updatedUserWallet = await tx.wallet.update({
                where: { id: userWallet.id },
                data: { balance: { increment: amount } },
            });

            // 5. Criar transação REVERSED
            const transaction = await tx.transaction.create({
                data: {
                    fromWalletId: campaignWallet.id,
                    toWalletId: userWallet.id,
                    amount,
                    type: 'CAMPAIGN_CONTRIBUTION',
                    status: 'REVERSED',
                    metadata: {
                        campaignId,
                        campaignTitle: campaignTitle ?? null,
                        reason: 'saga_compensation',
                    },
                },
            });

            return {
                transaction,
                newBalance: Number(updatedUserWallet.balance),
            };
        }, {
            isolationLevel: 'Serializable',
            timeout: 10000,
        });

        await this.redis.publish(STREAM, 'contribution.reversed', {
            transactionId: result.transaction.id,
            userId,
            campaignId,
            amount,
        });

        this.logger.warn(`Refunded ${amount} to userId=${userId} for campaign ${campaignId} (saga compensation)`);
        return result;
    }

    // ── Transactions Query ───────────────────────────────────

    async getTransactions(userId: string, query: TransactionsQueryDto)
    {
        const wallet = await this.getWalletByUserId(userId);
        const { page = 1, limit = 20, type } = query;
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
            data: transactions.map((tx) => this.normalizeTransaction(tx)),
            pagination: {
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
        return this.normalizeTransaction(transaction);
    }

    private async ensureWallet(userId: string)
    {
        let wallet = await this.conn.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await this.createWallet(userId);
        }
        return wallet;
    }

    private normalizeTransaction(transaction: any)
    {
        return {
            ...transaction,
            amount: transaction.amount?.toString?.() ?? String(transaction.amount),
            metadata: transaction.metadata && typeof transaction.metadata === 'object'
                ? transaction.metadata
                : {},
        };
    }

    private async resolveUserIdentifier(identifier: string): Promise<string>
    {
        // Se já é UUID válido, retorna direto
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(identifier)) {
            return identifier;
        }

        // Tenta resolver via user-service search endpoint
        if (this.userServiceUrl) {
            try {
                const response = await fetch(`${this.userServiceUrl}/users/search?q=${encodeURIComponent(identifier)}`, { method: 'GET' });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        return data[0].id;
                    }

                    if (
                        data &&
                        typeof data === 'object' &&
                        Array.isArray((data as { users?: Array<{ id: string }> }).users) &&
                        (data as { users: Array<{ id: string }> }).users.length > 0
                    ) {
                        return (data as { users: Array<{ id: string }> }).users[0].id;
                    }
                }
            } catch (error) {
                this.logger.warn(`Failed to resolve identifier ${identifier}: ${error}`);
            }
        }

        throw new NotFoundException(`USER_NOT_FOUND: ${identifier}`);
    }

    private extractRecipientIdentifier(payload: Record<string, unknown>): string
    {
        const preferred = [
            payload.toUserId,
            payload.recipient,
            payload.recipientId,
            payload.recipientEmail,
            payload.to,
            payload.toEmail,
            payload.toUser,
            payload.toUserEmail,
            payload.email,
            payload.identifier,
            payload.destinatario,
            payload.destinatarioEmail,
            payload.user,
            payload.target,
            payload.destination,
        ];

        for (const value of preferred) {
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }

        // Fallback defensivo: tenta qualquer campo string exceto campos conhecidos não-destinatário.
        const ignored = new Set(['amount', 'note', 'description', 'memo', 'message', 'currency']);
        for (const [key, value] of Object.entries(payload)) {
            if (ignored.has(key)) {
                continue;
            }
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }

        return '';
    }

    private async getUserProfile(userId: string): Promise<{ id: string; username?: string }>
    {
        if (!this.userServiceUrl) {
            return { id: userId };
        }

        const response = await fetch(`${this.userServiceUrl}/users/${userId}`, { method: 'GET' });
        if (response.status === 404) {
            throw new NotFoundException('RECIPIENT_USER_NOT_FOUND');
        }
        if (!response.ok) {
            this.logger.warn(`Could not resolve user profile for ${userId}, status=${response.status}`);
            return { id: userId };
        }

        const data = await response.json().catch(() => null);
        if (!data || typeof data !== 'object') {
            return { id: userId };
        }

        return {
            id: (data as any).id ?? userId,
            username: (data as any).username,
        };
    }

    private mergeMetadata(current: unknown, extra: Record<string, any>): Record<string, any>
    {
        const safeCurrent =
            current && typeof current === 'object' && !Array.isArray(current)
                ? current as Record<string, any>
                : {};

        const baseOnChain =
            safeCurrent.onChain && typeof safeCurrent.onChain === 'object' && !Array.isArray(safeCurrent.onChain)
                ? safeCurrent.onChain as Record<string, any>
                : {};

        const extraOnChain =
            extra.onChain && typeof extra.onChain === 'object' && !Array.isArray(extra.onChain)
                ? extra.onChain as Record<string, any>
                : {};

        return {
            ...safeCurrent,
            ...extra,
            onChain: {
                ...baseOnChain,
                ...extraOnChain,
            },
        };
    }

}

