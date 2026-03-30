import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service.js';
import {
  AuthProxyController,
  BlocksProxyController,
  FriendRequestsProxyController,
  FriendsProxyController,
  FriendshipStatusProxyController,
  UsersProxyController,
  WalletProxyController,
  CampaignsProxyController,
  UploadProxyController,
  InvitationsProxyController,
  NotificationsProxyController,
  LedgerProxyController,
} from './proxy.controller.js';

@Module({
  controllers: [
    AuthProxyController,
    FriendsProxyController,
    FriendRequestsProxyController,
    BlocksProxyController,
    FriendshipStatusProxyController,
    UsersProxyController,
    WalletProxyController,
    CampaignsProxyController,
    UploadProxyController,
    InvitationsProxyController,
    NotificationsProxyController,
    LedgerProxyController,
  ],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
