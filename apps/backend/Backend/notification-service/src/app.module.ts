import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './auth/auth.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { EventsModule } from './events/events.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
