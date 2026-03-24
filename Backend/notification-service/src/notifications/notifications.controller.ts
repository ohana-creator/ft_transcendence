import {
  Controller, Get, Put, Delete,
  Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('ws')
  @ApiOperation({ summary: 'WebSocket connection info for real-time notifications' })
  @ApiOkResponse({
    description: 'Connection details for Socket.io notifications channel',
    schema: {
      type: 'object',
      properties: {
        namespace: { type: 'string', example: '/notifications' },
        event: { type: 'string', example: 'notification' },
        auth: {
          type: 'object',
          properties: {
            method: { type: 'string', example: 'JWT Bearer token in handshake' },
            handshakeAuth: { type: 'string', example: 'auth.token' },
            handshakeHeader: { type: 'string', example: 'Authorization: Bearer <token>' },
          },
        },
        exampleClient: {
          type: 'string',
          example: "io('ws://localhost:3003/notifications', { auth: { token: '<JWT>' } })",
        },
      },
    },
  })
  getWsInfo() {
    return {
      namespace: '/notifications',
      event: 'notification',
      auth: {
        method: 'JWT Bearer token in handshake',
        handshakeAuth: 'auth.token',
        handshakeHeader: 'Authorization: Bearer <token>',
      },
      exampleClient: "io('ws://localhost:3003/notifications', { auth: { token: '<JWT>' } })",
    };
  }

  @Get()
  @ApiOperation({ summary: 'List notifications (paginated)' })
  findAll(
    @CurrentUser() user: { userId: string },
    @Query() dto: ListNotificationsDto,
  ) {
    return this.notificationsService.findAll(user.userId, dto);
  }

  @Get('unread')
  @ApiOperation({ summary: 'List unread notifications' })
  findUnread(
    @CurrentUser() user: { userId: string },
    @Query() dto: ListNotificationsDto,
  ) {
    return this.notificationsService.findUnread(user.userId, dto);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(
    @CurrentUser() user: { userId: string },
  ) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete notification' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.notificationsService.remove(id, user.userId);
  }
}
