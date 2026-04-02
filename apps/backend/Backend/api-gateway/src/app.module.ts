import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProxyModule } from './proxy/proxy.module.js';

const isProduction = process.env.NODE_ENV === 'production';
const throttlerTtlMs = Number(process.env.API_THROTTLE_TTL_MS ?? 60000);
const throttlerLimit = Number(
  process.env.API_THROTTLE_LIMIT ?? (isProduction ? 120 : 3000),
);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: throttlerTtlMs, limit: throttlerLimit }]),
    RedisModule,
    AuthModule,
    ProxyModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
