import { Module } from '@nestjs/common';
import { CampaignsController, InvitationsController, UploadController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignImageService } from './campaign-image.service';
import { WalletModule } from '../wallet/wallet.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [WalletModule, NotificationsModule],
  controllers: [CampaignsController, InvitationsController, UploadController],
  providers: [
    CampaignsService,
    CampaignImageService,
    { provide: 'CAMPAIGN_IMAGE_SERVICE', useExisting: CampaignImageService },
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
