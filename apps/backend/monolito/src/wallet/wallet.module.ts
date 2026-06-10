import { Module } from '@nestjs/common';
import {
  WalletController,
  WalletInternalController,
  WalletTopupInternalController,
} from './wallet.controller.js';
import { WalletService } from './wallet.service.js';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [WalletController, WalletInternalController, WalletTopupInternalController],
  providers: [WalletService, RedisService],
  exports: [WalletService],
})
export class WalletModule {}
