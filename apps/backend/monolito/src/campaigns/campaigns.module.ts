import { Module } from '@nestjs/common';
import { CampaignsController, InvitationsController, UploadController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignImageService } from './campaign-image.service';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [CampaignsController, InvitationsController, UploadController],
  providers: [
    CampaignsService,
    CampaignImageService,
    RedisService,
    { provide: 'CAMPAIGN_IMAGE_SERVICE', useExisting: CampaignImageService },
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
