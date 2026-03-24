import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service.js';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /** userId → Set of connected sockets */
  private readonly userSockets = new Map<string, Set<Socket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // ── Connection lifecycle ────────────────────────────────

  async handleConnection(client: Socket)
  {
    try
    {
      const user = await this.authenticateClient(client);
      client.data.userId = user.userId;

      if (!this.userSockets.has(user.userId))
      {
        this.userSockets.set(user.userId, new Set());
      }
      this.userSockets.get(user.userId)!.add(client);

      this.logger.log(`Client connected: ${client.id} (user: ${user.userId})`);
    }
    catch (err: any)
    {
      this.logger.warn(`Connection rejected: ${client.id} — ${err.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket)
  {
    const userId = client.data?.userId;
    if (userId)
    {
      const sockets = this.userSockets.get(userId);
      if (sockets)
      {
        sockets.delete(client);
        if (sockets.size === 0)
        {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Push notification to user ───────────────────────────

  sendToUser(userId: string, notification: any): void
  {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    for (const socket of sockets)
    {
      socket.emit('notification', notification);
    }
    this.logger.debug(`Pushed notification to user ${userId} (${sockets.size} socket(s))`);
  }

  // ── JWT authentication from handshake ───────────────────

  private async authenticateClient(client: Socket): Promise<{ userId: string; email: string; username: string }>
  {
    // Token can be in auth.token or as Bearer in authorization header
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token)
    {
      throw new Error('No token provided');
    }

    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const payload = this.jwtService.verify(token, { secret });

    if (payload.isTwoFA)
    {
      throw new Error('Invalid token type');
    }

    if (!payload.jti)
    {
      throw new Error('Invalid token');
    }

    const isBlacklisted = await this.redisService.isTokenBlacklisted(payload.jti);
    if (isBlacklisted)
    {
      throw new Error('Token has been revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
