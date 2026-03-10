import { Module } from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service.js';
// Assuming there's a NotificationsModule, but since it's empty, placeholder
// import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
    // imports: [NotificationsModule],
    providers: [EventConsumerService],
})
export class EventsModule {}