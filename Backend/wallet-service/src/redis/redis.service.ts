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

    /** Publicar evento no Redis Stream */
    async publishEvent(stream: string, data: Record<string, any>): Promise<string>
    {
        const fields = Object.entries(data).flat().map(String);
        const id = await this.client.xadd(stream, '*', ...fields);
        this.logger.log(`Published to ${stream}: ${id}`);
        return (id!);
    }

    /** Ler eventos de um stream (para o listener de user.created) */
    async readStream(stream: string, lastId: string = '0', count: number = 10)
    {
        return (this.client.xread('COUNT', count, 'BLOCK', 1000, 'STREAMS', stream, lastId));
    }

    /** Ler eventos continuamente com XREADGROUP (consumer group) */
    async createConsumerGroup(stream: string, group: string)
    {
        try
        {
        await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
        } 
        catch (err: any)
        {
        if (!err.message.includes('BUSYGROUP')) throw err;
        // Grupo já existe — ok
        }
    }

    async readGroup(stream: string, group: string, consumer: string, count: number = 10)
    {
        return this.client.xreadgroup('GROUP', group, consumer, 'COUNT', count, 'BLOCK', 2000, 'STREAMS', stream, '>');
    }

    async ack(stream: string, group: string, ...ids: string[])
    {
        return (this.client.xack(stream, group, ...ids));
    }

    getClient(): Redis
    {
        return (this.client);
    }

    async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${jti}`);
    return result !== null;
  }
}