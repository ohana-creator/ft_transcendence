import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { RedisService } from "../redis/redis.service.js";
import { LedgerService } from "../ledger/ledger.service.js";
export declare class EventConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly redis;
    private readonly ledger;
    private readonly logger;
    private readonly GROUP;
    private readonly CONSUMER;
    private readonly subscriptions;
    private running;
    constructor(redis: RedisService, ledger: LedgerService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private registerHandlers;
    private on;
    private setupConsumerGroups;
    private startPolling;
    private pollStream;
    private processMessage;
}
