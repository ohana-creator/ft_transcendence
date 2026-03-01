import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    };
    this.client = new Redis(config);

    this.client.on('connect', () => this.logger.log('Redis client connected'));
    this.client.on('error', (err) => this.logger.error('Redis client error', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ── Token Blacklist ──────────────────────────────────────

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${jti}`);
    return result !== null;
  }

  // ── Streams ──────────────────────────────────────────────

  async addToStream(stream: string, data: Record<string, any>): Promise<string> {
    const id = await this.client.xadd(
      stream,
      '*',
      'payload',
      JSON.stringify(data),
    );
    if (!id) throw new Error(`Failed to add to stream ${stream}`);
    this.logger.log(`Added to stream ${stream} (id: ${id})`);
    return id;
  }
}