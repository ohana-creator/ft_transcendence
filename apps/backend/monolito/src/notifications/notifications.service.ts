import {
  Injectable, NotFoundException, Logger, Inject, forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  // ── Create notification (called by event consumers) ──────

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata ?? undefined,
      },
    });
    // Push real-time notification via WebSocket
    this.gateway.sendToUser(dto.userId, notification);

    this.logger.log(`Notification created: ${notification.id} (${dto.type}) for user ${dto.userId}`);
    return notification;
  }

  // ── List notifications (paginated) ───────────────────────

  async findAll(userId: string, dto: ListNotificationsDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── List unread notifications ────────────────────────────

  async findUnread(userId: string, dto: ListNotificationsDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where = { userId, read: false };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── Mark as read ─────────────────────────────────────────

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  // ── Mark all as read ─────────────────────────────────────

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  }

  // ── Delete notification ──────────────────────────────────

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }
}
