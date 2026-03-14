import { Module }               from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service.js';
import { LedgerModule }         from '../ledger/ledger.module.js';

@Module({
  imports:   [LedgerModule],
  providers: [EventConsumerService],
})
export class EventsModule {}