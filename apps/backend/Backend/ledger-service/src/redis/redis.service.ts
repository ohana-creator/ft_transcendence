import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import * as fs from 'fs';

function getRedisPassword(): string {
  const file = process.env.REDIS_PASSWORD_FILE;
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  return process.env.REDIS_PASSWORD ?? '';
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  async onModuleInit() {
    const password = getRedisPassword();
    this.client = createClient({
      socket:   { host: process.env.REDIS_HOST ?? 'redis', port: Number(process.env.REDIS_PORT ?? 6379) },
      password: password || undefined,
    }) as RedisClientType;

    this.client.on('error', (err) => this.logger.error('Redis error', err));
    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy() { await this.client?.quit(); }

  async publish(stream: string, event: string, payload: object): Promise<void> {
    await this.client.xAdd(stream, '*', { event, payload: JSON.stringify(payload) });
  }

  async ensureConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xGroupCreate(stream, group, '$', { MKSTREAM: true });
    } catch (e: any) {
      if (!e.message.includes('BUSYGROUP')) throw e;
    }
  }

  async consumeGroup(stream: string, group: string, consumer: string) {
    return this.client.xReadGroup(group, consumer,
      [{ key: stream, id: '>' }],
      { COUNT: 10, BLOCK: 2000 },
    );
  }

  async ack(stream: string, group: string, id: string): Promise<void> {
    await this.client.xAck(stream, group, id);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.exists(`blacklist:${jti}`);
    return result === 1;
  }

  async blacklistToken(jti: string, expirationSeconds?: number): Promise<void> {
    const key = `blacklist:${jti}`;
    if (expirationSeconds) {
      await this.client.setEx(key, expirationSeconds, '1');
    } else {
      await this.client.set(key, '1');
    }
  }
}
