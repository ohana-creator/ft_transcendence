import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { ListFriendRequestsDto } from './dto/list-friend-requests.dto';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';

@ApiTags('social')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SocialController {
  constructor(private readonly usersService: UsersService) {}

  @Get('friends')
  @ApiOperation({ summary: 'List authenticated user friends' })
  async getFriends(@CurrentUser() user: { userId: string }) {
    return this.usersService.listFriends(user.userId);
  }

  @Delete('friends/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove friendship with target user' })
  async removeFriend(
    @CurrentUser() user: { userId: string },
    @Param('userId') targetUserId: string,
  ) {
    await this.usersService.removeFriend(user.userId, targetUserId);
  }

  @Get('friend-requests')
  @ApiOperation({ summary: 'List incoming/outgoing friend requests' })
  async listRequests(
    @CurrentUser() user: { userId: string },
    @Query() query: ListFriendRequestsDto,
  ) {
    return this.usersService.listFriendRequests(user.userId, query);
  }

  @Post('friend-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a friend request' })
  async createRequest(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.usersService.createFriendRequest(user.userId, dto);
  }

  @Patch('friend-requests/:id/accept')
  @ApiOperation({ summary: 'Accept incoming friend request' })
  async acceptRequest(
    @CurrentUser() user: { userId: string },
    @Param('id') requestId: string,
  ) {
    return this.usersService.acceptFriendRequest(user.userId, requestId);
  }

  @Patch('friend-requests/:id/decline')
  @ApiOperation({ summary: 'Decline incoming friend request' })
  async declineRequest(
    @CurrentUser() user: { userId: string },
    @Param('id') requestId: string,
  ) {
    return this.usersService.declineFriendRequest(user.userId, requestId);
  }

  @Delete('friend-requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel outgoing friend request' })
  async cancelRequest(
    @CurrentUser() user: { userId: string },
    @Param('id') requestId: string,
  ) {
    await this.usersService.cancelFriendRequest(user.userId, requestId);
  }

  @Post('blocks/:userId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Block target user' })
  async blockUser(
    @CurrentUser() user: { userId: string },
    @Param('userId') targetUserId: string,
  ) {
    return this.usersService.blockUser(user.userId, targetUserId);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock target user' })
  async unblockUser(
    @CurrentUser() user: { userId: string },
    @Param('userId') targetUserId: string,
  ) {
    await this.usersService.unblockUser(user.userId, targetUserId);
  }

  @Get('friendship-status/:username')
  @ApiOperation({ summary: 'Get friendship status with target username' })
  async friendshipStatus(
    @CurrentUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getFriendshipStatus(user.userId, username);
  }
}
