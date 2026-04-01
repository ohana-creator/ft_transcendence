import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { EmailService } from './email.service.js';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, EmailService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
