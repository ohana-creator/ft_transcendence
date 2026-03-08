import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    CampaignsModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
