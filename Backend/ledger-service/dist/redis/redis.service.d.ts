import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private client;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    publish(stream: string, event: string, payload: object): Promise<void>;
    ensureConsumerGroup(stream: string, group: string): Promise<void>;
    consumeGroup(stream: string, group: string, consumer: string): Promise<{
        name: string;
        messages: {
            id: string;
            message: {
                [x: string]: string;
            };
        }[];
    }[]>;
    ack(stream: string, group: string, id: string): Promise<void>;
}
