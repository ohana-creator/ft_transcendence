import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from './prisma.service';
import {ConfigModule} from "@nestjs/config"

@Module({
  imports: [ConfigModule.forRoot({ 
    isGlobal: true,
  })],
  controllers: [HealthController],
  providers: [HealthService, PrismaService],
})
export class AppModule {}
