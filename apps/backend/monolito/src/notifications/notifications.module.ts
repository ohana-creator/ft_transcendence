import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { EmailService } from './email.service.js';
import { RedisService } from '../redis/redis.service';

@Module({
  imports: [AuthModule, JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, EmailService, RedisService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
