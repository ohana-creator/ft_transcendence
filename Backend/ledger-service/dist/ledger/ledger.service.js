"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LedgerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../database/prisma.service.js");
const blockchain_service_js_1 = require("../blockchain/blockchain.service.js");
const redis_service_js_1 = require("../redis/redis.service.js");
const STREAM = 'ledger-events';
let LedgerService = LedgerService_1 = class LedgerService {
    constructor(prisma, blockchain, redis) {
        this.prisma = prisma;
        this.blockchain = blockchain;
        this.redis = redis;
        this.logger = new common_1.Logger(LedgerService_1.name);
    }
    async registerWallet(userId, walletAddr) {
        return this.prisma.walletMapping.upsert({
            where: { userId },
            update: { walletAddr },
            create: { userId, walletAddr },
        });
    }
    async getWalletAddress(userId) {
        const m = await this.prisma.walletMapping.findUnique({ where: { userId } });
        if (!m)
            throw new common_1.NotFoundException(`No wallet registered for userId=${userId}`);
        return m.walletAddr;
    }
    async mint(dto) {
        await this.registerWallet(dto.userId, dto.walletAddress);
        const entry = await this.prisma.ledgerEntry.create({
            data: {
                userId: dto.userId,
                walletAddr: dto.walletAddress,
                amount: dto.amount,
                operation: 'MINT',
                ref: dto.ref ?? `mint:${dto.userId}`,
                status: 'PENDING',
            },
        });
        try {
            const txHash = await this.blockchain.mint(dto.walletAddress, dto.amount, entry.id);
            const tx = await this.blockchain.getTransaction(txHash);
            const confirmed = await this.prisma.ledgerEntry.update({
                where: { id: entry.id },
                data: {
                    txHash,
                    status: 'CONFIRMED',
                    blockNumber: tx?.blockNumber,
                },
            });
            await this.redis.publish(STREAM, 'ledger.mint.confirmed', {
                entryId: confirmed.id,
                userId: dto.userId,
                amount: dto.amount,
                txHash,
            });
            return confirmed;
        }
        catch (err) {
            await this.prisma.ledgerEntry.update({
                where: { id: entry.id },
                data: { status: 'FAILED', metadata: { error: err.message } },
            });
            throw err;
        }
    }
    async transfer(fromUserId, dto) {
        const fromAddr = await this.getWalletAddress(fromUserId);
        const entry = await this.prisma.ledgerEntry.create({
            data: {
                userId: fromUserId,
                walletAddr: fromAddr,
                amount: dto.amount,
                operation: 'TRANSFER',
                ref: `transfer:${fromUserId}→${dto.toAddress}`,
                status: 'PENDING',
                metadata: { toAddress: dto.toAddress },
            },
        });
        try {
            const txHash = await this.blockchain.transfer(dto.toAddress, dto.amount);
            const tx = await this.blockchain.getTransaction(txHash);
            const confirmed = await this.prisma.ledgerEntry.update({
                where: { id: entry.id },
                data: { txHash, status: 'CONFIRMED', blockNumber: tx?.blockNumber },
            });
            await this.redis.publish(STREAM, 'ledger.transfer.confirmed', {
                entryId: confirmed.id,
                fromUserId,
                toAddress: dto.toAddress,
                amount: dto.amount,
                txHash,
            });
            return confirmed;
        }
        catch (err) {
            await this.prisma.ledgerEntry.update({
                where: { id: entry.id },
                data: { status: 'FAILED', metadata: { error: err.message } },
            });
            throw err;
        }
    }
    async getBalance(userId) {
        const walletAddr = await this.getWalletAddress(userId);
        const [onChain, supply] = await Promise.all([
            this.blockchain.getBalance(walletAddr),
            this.blockchain.getTotalSupply(),
        ]);
        return { userId, walletAddr, balance: onChain, totalSupply: supply };
    }
    async getBalanceByAddress(walletAddr) {
        const balance = await this.blockchain.getBalance(walletAddr);
        return { walletAddr, balance };
    }
    async getHistory(userId, query) {
        const { operation, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (operation)
            where.operation = operation;
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
    async getTransaction(txHash) {
        const [entry, onChain] = await Promise.all([
            this.prisma.ledgerEntry.findUnique({ where: { txHash } }),
            this.blockchain.getTransaction(txHash),
        ]);
        if (!entry)
            throw new common_1.NotFoundException('Transaction not found in ledger');
        return { ...entry, onChain };
    }
    async handleWalletDeposit(payload) {
        const mapping = await this.prisma.walletMapping.findUnique({ where: { userId: payload.userId } });
        if (!mapping) {
            this.logger.warn(`No wallet mapping for userId=${payload.userId} — skipping mint`);
            return;
        }
        await this.mint({
            userId: payload.userId,
            walletAddress: mapping.walletAddr,
            amount: payload.amount,
            ref: `wallet.deposit:${payload.transactionId}`,
        });
    }
};
exports.LedgerService = LedgerService;
exports.LedgerService = LedgerService = LedgerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        blockchain_service_js_1.BlockchainService,
        redis_service_js_1.RedisService])
], LedgerService);
//# sourceMappingURL=ledger.service.js.map