import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignEventsListener } from '../events/campaign-events.listener';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignEventsListener],
  exports: [CampaignsService],
})
export class CampaignsModule {}
