import { Module } from '@nestjs/common';
import {
  WalletController,
  WalletInternalController,
  WalletTopupInternalController,
} from './wallet.controller.js';
import { WalletService } from './wallet.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
    imports: [NotificationsModule],
  controllers: [WalletController, WalletInternalController, WalletTopupInternalController],
    providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
