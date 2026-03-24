import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ── Token Blacklist ───────────────────────────────────────

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${jti}`);
    return result !== null;
  }
}
