import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';

@Injectable()
export class UserEventsListener {
  private readonly logger = new Logger(UserEventsListener.name);

  constructor(private readonly usersService: UsersService) {}

  @OnEvent('user.created')
  async handleUserCreated(payload: { id: number; email: string; username: string }) {
    this.logger.log(`user.created received for userId=${payload.id}`);
    await this.usersService.createFromEvent(payload);
  }
}