import { PrismaService } from '../database/prisma.service.js';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { RedisService } from '../redis/redis.service.js';
import { MintDto } from './dto/mint.dto.js';
import { TransferDto } from './dto/transfer.dto.js';
import { LedgerQueryDto } from './dto/ledger-query.dto.js';
export declare class LedgerService {
    private readonly prisma;
    private readonly blockchain;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, blockchain: BlockchainService, redis: RedisService);
    registerWallet(userId: string, walletAddr: string): Promise<{
        id: string;
        userId: string;
        walletAddr: string;
        createdAt: Date;
    }>;
    getWalletAddress(userId: string): Promise<string>;
    mint(dto: MintDto): Promise<{
        id: string;
        userId: string;
        walletAddr: string;
        createdAt: Date;
        txHash: string | null;
        amount: number;
        operation: import(".prisma/client").$Enums.LedgerOperation;
        ref: string | null;
        blockNumber: number | null;
        status: import(".prisma/client").$Enums.LedgerStatus;
        metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
    }>;
    transfer(fromUserId: string, dto: TransferDto): Promise<{
        id: string;
        userId: string;
        walletAddr: string;
        createdAt: Date;
        txHash: string | null;
        amount: number;
        operation: import(".prisma/client").$Enums.LedgerOperation;
        ref: string | null;
        blockNumber: number | null;
        status: import(".prisma/client").$Enums.LedgerStatus;
        metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
    }>;
    getBalance(userId: string): Promise<{
        userId: string;
        walletAddr: string;
        balance: string;
        totalSupply: string;
    }>;
    getBalanceByAddress(walletAddr: string): Promise<{
        walletAddr: string;
        balance: string;
    }>;
    getHistory(userId: string, query: LedgerQueryDto): Promise<{
        data: {
            id: string;
            userId: string;
            walletAddr: string;
            createdAt: Date;
            txHash: string | null;
            amount: number;
            operation: import(".prisma/client").$Enums.LedgerOperation;
            ref: string | null;
            blockNumber: number | null;
            status: import(".prisma/client").$Enums.LedgerStatus;
            metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getTransaction(txHash: string): Promise<{
        onChain: {
            hash: string;
            blockNumber: number;
            status: string;
            gasUsed: string;
            explorerUrl: string;
        };
        id: string;
        userId: string;
        walletAddr: string;
        createdAt: Date;
        txHash: string | null;
        amount: number;
        operation: import(".prisma/client").$Enums.LedgerOperation;
        ref: string | null;
        blockNumber: number | null;
        status: import(".prisma/client").$Enums.LedgerStatus;
        metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
    }>;
    handleWalletDeposit(payload: {
        userId: string;
        amount: number;
        transactionId: string;
    }): Promise<void>;
}
