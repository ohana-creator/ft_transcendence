import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly Config: ConfigService) {
    
    this.client = new Redis({
      url: this.Config.get<string>('UPSTASH_REDIS_REST_URL'), //process.env.UPSTASH_REDIS_REST_URL,
      token: this.Config.get<string>('UPSTASH_REDIS_REST_TOKEN'),
    });

    this.logger.log('Redis client connected');
  }

  async onModuleDestroy() {
  }

  // ── Token Blacklist ──────────────────────────────────────

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`blacklist:${jti}`, '1', {ex: ttlSeconds});
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${jti}`);
    return result !== null;
  }

    // ── Event Publishing ──────────────────────────────────────

  async publish(stream: string, event: string, data: Record<string, any>): Promise<string> {
    const id = await this.client.xadd(stream, '*', {
  event,
  payload: JSON.stringify(data),
});
    if (!id) throw new Error(`Failed to publish ${event} to ${stream}`);
    this.logger.log(`Published ${event} to ${stream} (id: ${id})`);
    return id;
  }

}