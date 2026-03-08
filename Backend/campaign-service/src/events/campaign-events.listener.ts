import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class CampaignEventsListener {
  private readonly logger = new Logger(CampaignEventsListener.name);

  constructor(private readonly campaignsService: CampaignsService) {}

  @OnEvent('user.updated')
  async handleUserUpdated(payload: { id: number; username: string }) {
    this.logger.log(`user.updated received for userId=${payload.id}`);
    await this.campaignsService.handleUserUpdated(payload);
  }

  @OnEvent('goal.reached')
  handleGoalReached(payload: { campaignId: number; goalAmount: number }) {
    this.logger.log(`goal.reached for campaignId=${payload.campaignId}`);
  }

  @OnEvent('campaign.created')
  handleCampaignCreated(payload: { id: number; title: string }) {
    this.logger.log(`campaign.created id=${payload.id}`);
  }

  @OnEvent('campaign.closed')
  handleCampaignClosed(payload: { id: number }) {
    this.logger.log(`campaign.closed id=${payload.id}`);
  }
}
