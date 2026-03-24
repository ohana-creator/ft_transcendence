import { Module } from '@nestjs/common';
import { WalletController, WalletInternalController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';

@Module({
  controllers: [WalletController, WalletInternalController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
