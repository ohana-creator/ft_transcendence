import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AvatarService } from './avatar/avatar.service';
import { UserEventsListener } from '../events/user-events.listener';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AvatarService, UserEventsListener],
  exports: [UsersService],
})
export class UsersModule {}