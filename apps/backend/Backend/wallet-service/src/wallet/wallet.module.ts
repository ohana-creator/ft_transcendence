import { Module } from '@nestjs/common';
import {
  WalletController,
  WalletInternalController,
  WalletTopupInternalController,
} from './wallet.controller.js';
import { WalletService } from './wallet.service.js';

@Module({
  controllers: [WalletController, WalletInternalController, WalletTopupInternalController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
