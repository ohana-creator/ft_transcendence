import { Module } from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
    imports: [WalletModule],
    providers: [EventConsumerService],
})
export class EventsModule {}
