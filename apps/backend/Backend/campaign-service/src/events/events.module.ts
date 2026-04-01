import { Module } from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';

@Module({
    imports: [CampaignsModule],
    providers: [EventConsumerService],
})
export class EventsModule {}
