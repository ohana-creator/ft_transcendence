import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { SocialController } from './social.controller';
import { UsersService } from './users.service';
import { AvatarService } from './avatar/avatar.service';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [UsersController, SocialController],
  providers: [UsersService, AvatarService, RedisService],
  exports: [UsersService],
})
export class UsersModule {}