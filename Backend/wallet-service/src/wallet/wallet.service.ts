import { PrismaService } from "src/database/prisma.service";
import { Wallet } from "generated/prisma/client";
import { RedisService } from "src/redis/redis.service";
import { UnauthorizedException,
    NotFoundException,
    BadRequestException,
    Injectable,
    Logger } from "@nestjs/common";
import { TransferDto } from "./dto/transfer.dto";
import { TransactionsQueryDto } from "./dto/transactions-query.dto";

@Injectable()
export class WalletService
{
    private readonly logger = new Logger(WalletService.name);

    constructor(private readonly conn: PrismaService)
    {
    }

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

        return result;
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

