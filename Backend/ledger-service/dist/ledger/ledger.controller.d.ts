import { LedgerService } from './ledger.service.js';
import { MintDto } from './dto/mint.dto.js';
import { TransferDto } from './dto/transfer.dto.js';
import { LedgerQueryDto } from './dto/ledger-query.dto.js';
export declare class LedgerController {
    private readonly ledgerService;
    constructor(ledgerService: LedgerService);
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
    transfer(user: any, dto: TransferDto): Promise<{
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
    registerWallet(user: any, walletAddress: string): Promise<{
        id: string;
        userId: string;
        walletAddr: string;
        createdAt: Date;
    }>;
    getBalance(user: any): Promise<{
        userId: string;
        walletAddr: string;
        balance: string;
        totalSupply: string;
    }>;
    getBalanceByAddress(address: string): Promise<{
        walletAddr: string;
        balance: string;
    }>;
    getHistory(user: any, query: LedgerQueryDto): Promise<{
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
    getTransaction(hash: string): Promise<{
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
}
