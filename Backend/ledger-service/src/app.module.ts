import { Module }         from '@nestjs/common';
import { ConfigModule }   from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule }   from './database/prisma.module.js';
import { RedisModule }    from './redis/redis.module.js';
import { AuthModule }     from './auth/auth.module.js';
import { BlockchainModule } from './blockchain/blockchain.module.js';
import { LedgerModule }   from './ledger/ledger.module.js';
import { EventsModule }   from './events/events.module.js';
import { HealthController } from './health.controller.js';
import { HealthService }    from './health.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    BlockchainModule,
    LedgerModule,
    EventsModule,
  ],
  controllers: [HealthController],
  providers:   [HealthService],
})
export class AppModule {}