import { Module } from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
    imports: [NotificationsModule],
    providers: [EventConsumerService],
})
export class EventsModule {}
