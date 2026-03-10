import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy
{
    private readonly client: Redis;
    private readonly logger = new Logger(RedisService.name);

    constructor()
    {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
        });
    }

    async onModuleDestroy()
    {
        await this.client.quit();
    }

    // ── Event Publishing ──────────────────────────────────────

    async publish(stream: string, event: string, data: Record<string, any>): Promise<string>
    {
        const id = await this.client.xadd(stream, '*', 'event', event, 'payload', JSON.stringify(data));
        if (!id) throw new Error(`Failed to publish ${event} to ${stream}`);
        this.logger.log(`Published ${event} to ${stream} (id: ${id})`);
        return id;
    }

    // ── Consumer Groups ───────────────────────────────────────

    async ensureConsumerGroup(stream: string, group: string): Promise<void>
    {
        try
        {
            await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
            this.logger.log(`Consumer group "${group}" created on stream "${stream}"`);
        }
        catch (err: any)
        {
            if (!err.message.includes('BUSYGROUP')) throw err;
            // Group already exists — OK
        }
    }

    async consumeGroup(
        stream: string,
        group: string,
        consumer: string,
        count: number = 10,
    )
    {
        return this.client.xreadgroup(
            'GROUP', group, consumer,
            'COUNT', count,
            'BLOCK', 2000,
            'STREAMS', stream, '>',
        );
    }

    async ack(stream: string, group: string, ...ids: string[]): Promise<number>
    {
        return this.client.xack(stream, group, ...ids);
    }

    // ── Token Blacklist ───────────────────────────────────────

    async isTokenBlacklisted(jti: string): Promise<boolean>
    {
        const result = await this.client.get(`blacklist:${jti}`);
        return result !== null;
    }
}