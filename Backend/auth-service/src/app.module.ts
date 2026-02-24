import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from './database/prisma.module';
//import { RedisService } from './redis.service';
import { AuthModule } from './auth/auth.module';
import {ConfigModule} from "@nestjs/config"

@Module({
  imports: [ConfigModule.forRoot({ 
    isGlobal: true,
  }),
  AuthModule,
  PrismaModule,
],
  controllers: [HealthController],
  providers: [HealthService],
})

export class AppModule {}
