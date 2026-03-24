import { Module } from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
    imports: [UsersModule],
    providers: [EventConsumerService],
})
export class EventsModule {}
