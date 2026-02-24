// redis.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  async onModuleInit() {
    await this.client.connect();
  }
}