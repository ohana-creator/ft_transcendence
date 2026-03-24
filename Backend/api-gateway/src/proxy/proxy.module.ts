import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service.js';
import {
  AuthProxyController,
  UsersProxyController,
  WalletProxyController,
  CampaignsProxyController,
  InvitationsProxyController,
  NotificationsProxyController,
  LedgerProxyController,
} from './proxy.controller.js';

@Module({
  controllers: [
    AuthProxyController,
    UsersProxyController,
    WalletProxyController,
    CampaignsProxyController,
    InvitationsProxyController,
    NotificationsProxyController,
    LedgerProxyController,
  ],
  providers: [ProxyService],
})
export class ProxyModule {}
