import { Module } from '@nestjs/common';
import { CampaignsController, InvitationsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [CampaignsController, InvitationsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
