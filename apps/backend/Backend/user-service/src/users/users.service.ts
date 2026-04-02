import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { ListFriendRequestsDto } from './dto/list-friend-requests.dto';
import { HeatmapQueryDto } from './dto/heatmap-query.dto';

type WalletTransaction = {
  id: string;
  type: string;
  status: string;
  amount: string | number;
  createdAt: string;
};

type WalletTransactionsResponse = {
  data?: WalletTransaction[];
  pagination?: {
    page?: number;
    totalPages?: number;
  };
};

@Injectable()
export class UsersService {
  private readonly walletServiceUrl = process.env.WALLET_SERVICE_URL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, avatarUrl: true, bio: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getSettings(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return {
      success: true,
      data: {
        account: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
        },
      },
    };
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    if (dto.username) {
      const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (existing && existing.id !== id) throw new ConflictException('Username already taken');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, username: true, avatarUrl: true, bio: true, updatedAt: true },
    });

    await this.redis.publish('user-events', 'user.updated', updated);
    return updated;
  }

  async search(dto: SearchUsersDto) {
    const { q, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where = q
      ? { OR: [{ username: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: { id: true, username: true, avatarUrl: true, bio: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateAvatar(id: string, avatarUrl: string) {
    await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
    await this.redis.publish('user-events', 'user.updated', updated);
    return updated;
  }

  async removeAvatar(id: string) {
    await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: { id: true, avatarUrl: true },
    });
    await this.redis.publish('user-events', 'user.updated', updated);
    return updated;
  }

  async createFromEvent(data: { id: string; email: string; username: string }) {
    const user = await this.prisma.user.upsert({
      where: { id: data.id },
      update: {},
      create: { id: data.id, email: data.email, username: data.username },
    });

    await this.redis.publish('user-events', 'user.created', {
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return user;
  }

  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: { id: true, username: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const friends = friendships.map((friendship) => {
      const friend = friendship.userAId === userId ? friendship.userB : friendship.userA;
      return {
        id: friend.id,
        username: friend.username,
        nome: friend.username,
        avatarUrl: friend.avatarUrl,
        friendsSince: friendship.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        friends,
        meta: { total: friends.length },
      },
    };
  }

  async listFriendRequests(userId: string, query: ListFriendRequestsDto) {
    const direction = query.direction ?? 'incoming';
    const status = query.status ?? 'PENDING';

    const where =
      direction === 'incoming'
        ? { toUserId: userId, status }
        : { fromUserId: userId, status };

    const requests = await this.prisma.friendRequest.findMany({
      where,
      include: {
        fromUser: { select: { id: true, username: true, avatarUrl: true } },
        toUser: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        requests: requests.map((request) => ({
          id: request.id,
          fromUser: {
            id: request.fromUser.id,
            username: request.fromUser.username,
            nome: request.fromUser.username,
            avatarUrl: request.fromUser.avatarUrl,
          },
          toUser: {
            id: request.toUser.id,
            username: request.toUser.username,
            nome: request.toUser.username,
            avatarUrl: request.toUser.avatarUrl,
          },
          status: request.status,
          createdAt: request.createdAt.toISOString(),
        })),
        meta: { total: requests.length },
      },
    };
  }

  async createFriendRequest(userId: string, dto: CreateFriendRequestDto) {
    if (!dto.targetUserId && !dto.targetUsername) {
      throw new BadRequestException('Either targetUserId or targetUsername is required');
    }

    const targetUser = dto.targetUserId
      ? await this.prisma.user.findUnique({ where: { id: dto.targetUserId } })
      : await this.prisma.user.findUnique({ where: { username: dto.targetUsername } });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.id === userId) {
      throw new UnprocessableEntityException('Cannot create friend request to yourself');
    }

    const [userAId, userBId] = this.orderPair(userId, targetUser.id);
    const [blockedBetweenPair, existingFriendship, existingPending] = await Promise.all([
      this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerUserId: userId, blockedUserId: targetUser.id },
            { blockerUserId: targetUser.id, blockedUserId: userId },
          ],
        },
      }),
      this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } }),
      this.prisma.friendRequest.findFirst({
        where: {
          status: 'PENDING',
          OR: [
            { fromUserId: userId, toUserId: targetUser.id },
            { fromUserId: targetUser.id, toUserId: userId },
          ],
        },
      }),
    ]);

    if (blockedBetweenPair) {
      throw new UnprocessableEntityException('There is an active block between users');
    }

    if (existingFriendship) {
      throw new ConflictException('Friendship already exists');
    }

    if (existingPending) {
      throw new ConflictException('Friend request already pending for this user pair');
    }

    const request = await this.prisma.friendRequest.create({
      data: {
        fromUserId: userId,
        toUserId: targetUser.id,
      },
    });

    return {
      success: true,
      data: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      },
    };
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.toUserId !== userId) {
      throw new ForbiddenException('Only the receiver can accept this request');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Friend request is not pending');
    }

    const [userAId, userBId] = this.orderPair(request.fromUserId, request.toUserId);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      let friendship = await tx.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
      if (!friendship) {
        friendship = await tx.friendship.create({
          data: { userAId, userBId },
        });
      }

      return { updatedRequest, friendship };
    });

    return {
      success: true,
      data: {
        requestId: result.updatedRequest.id,
        status: result.updatedRequest.status,
        friendship: {
          id: result.friendship.id,
          createdAt: result.friendship.createdAt.toISOString(),
        },
      },
    };
  }

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.toUserId !== userId) {
      throw new ForbiddenException('Only the receiver can decline this request');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Friend request is not pending');
    }

    const updated = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });

    return {
      success: true,
      data: {
        requestId: updated.id,
        status: updated.status,
      },
    };
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.fromUserId !== userId) {
      throw new ForbiddenException('Only sender can cancel this request');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Friend request is not pending');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELED', respondedAt: new Date() },
    });
  }

  async removeFriend(userId: string, targetUserId: string) {
    const [userAId, userBId] = this.orderPair(userId, targetUserId);
    const friendship = await this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }
    await this.prisma.friendship.delete({ where: { id: friendship.id } });
  }

  async blockUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new UnprocessableEntityException('Cannot block yourself');
    }

    await this.findById(targetUserId);

    const [userAId, userBId] = this.orderPair(userId, targetUserId);

    const blocked = await this.prisma.$transaction(async (tx) => {
      const block = await tx.block.upsert({
        where: { blockerUserId_blockedUserId: { blockerUserId: userId, blockedUserId: targetUserId } },
        update: {},
        create: { blockerUserId: userId, blockedUserId: targetUserId },
      });

      await tx.friendship.deleteMany({
        where: { userAId, userBId },
      });

      await tx.friendRequest.updateMany({
        where: {
          status: 'PENDING',
          OR: [
            { fromUserId: userId, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: userId },
          ],
        },
        data: {
          status: 'CANCELED',
          respondedAt: new Date(),
        },
      });

      return block;
    });

    return {
      success: true,
      data: {
        blockedUserId: blocked.blockedUserId,
        createdAt: blocked.createdAt.toISOString(),
      },
    };
  }

  async unblockUser(userId: string, targetUserId: string) {
    await this.prisma.block.deleteMany({
      where: {
        blockerUserId: userId,
        blockedUserId: targetUserId,
      },
    });
  }

  async getFriendshipStatus(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.id === userId) {
      return { success: true, data: { status: 'can-send' } };
    }

    const [userAId, userBId] = this.orderPair(userId, target.id);

    const [block, friendship, outgoingPending, incomingPending] = await Promise.all([
      this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerUserId: userId, blockedUserId: target.id },
            { blockerUserId: target.id, blockedUserId: userId },
          ],
        },
      }),
      this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } }),
      this.prisma.friendRequest.findFirst({
        where: { fromUserId: userId, toUserId: target.id, status: 'PENDING' },
      }),
      this.prisma.friendRequest.findFirst({
        where: { fromUserId: target.id, toUserId: userId, status: 'PENDING' },
      }),
    ]);

    let status = 'can-send';
    if (block) status = 'blocked';
    else if (friendship) status = 'friends';
    else if (outgoingPending) status = 'outgoing';
    else if (incomingPending) status = 'incoming';

    return {
      success: true,
      data: { status },
    };
  }

  async getProfileStats(userId: string, authHeader?: string) {
    const friendsCount = await this.prisma.friendship.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });

    const [contributionsCount, saldoVaks] = await Promise.all([
      this.getContributionsCount(authHeader),
      this.getWalletBalance(authHeader),
    ]);

    return {
      success: true,
      data: {
        friendsCount,
        campaignsCount: 0,
        contributionsCount,
        saldoVaks,
      },
    };
  }

  async getContributionHeatmap(userId: string, query: HeatmapQueryDto, authHeader?: string) {
    const timezone = 'Africa/Luanda';
    const transactions = await this.fetchWalletTransactions(authHeader, 'CAMPAIGN_CONTRIBUTION');

    const from = query.month
      ? new Date(Date.UTC(query.year, query.month - 1, 1))
      : new Date(Date.UTC(query.year, 0, 1));
    const to = query.month
      ? new Date(Date.UTC(query.year, query.month, 0, 23, 59, 59, 999))
      : new Date(Date.UTC(query.year, 11, 31, 23, 59, 59, 999));

    const counts = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.status !== 'COMPLETED') continue;
      const createdAt = new Date(tx.createdAt);
      if (Number.isNaN(createdAt.getTime())) continue;
      if (createdAt < from || createdAt > to) continue;

      const localDate = this.toLocalDate(createdAt, timezone);
      counts.set(localDate, (counts.get(localDate) ?? 0) + 1);
    }

    const days: Array<{ date: string; count: number }> = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const date = this.toLocalDate(cursor, timezone);
      days.push({ date, count: counts.get(date) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const totalContributions = days.reduce((sum, day) => sum + day.count, 0);

    return {
      success: true,
      data: {
        timezone,
        year: query.year,
        month: query.month,
        userId,
        totalContributions,
        days,
      },
    };
  }

  async getContributionYears(authHeader?: string) {
    const timezone = 'Africa/Luanda';
    const transactions = await this.fetchWalletTransactions(authHeader, 'CAMPAIGN_CONTRIBUTION');

    const years = Array.from(
      new Set(
        transactions
          .filter((tx) => tx.status === 'COMPLETED')
          .map((tx) => this.getYearInTimezone(new Date(tx.createdAt), timezone))
          .filter((year): year is number => Number.isFinite(year)),
      ),
    ).sort((a, b) => b - a);

    return {
      success: true,
      data: { years },
    };
  }

  private orderPair(first: string, second: string): [string, string] {
    return first < second ? [first, second] : [second, first];
  }

  private async getContributionsCount(authHeader?: string): Promise<number> {
    const txs = await this.fetchWalletTransactions(authHeader, 'CAMPAIGN_CONTRIBUTION');
    return txs.filter((tx) => tx.status === 'COMPLETED').length;
  }

  private async getWalletBalance(authHeader?: string): Promise<number> {
    if (!this.walletServiceUrl || !authHeader) return 0;

    try {
      const response = await fetch(`${this.walletServiceUrl}/wallet/balance`, {
        headers: { authorization: authHeader },
      });
      if (!response.ok) return 0;

      const payload = (await response.json()) as { balance?: string | number };
      const rawBalance = payload?.balance ?? 0;
      const parsed = Number(rawBalance);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private async fetchWalletTransactions(authHeader?: string, type?: string): Promise<WalletTransaction[]> {
    if (!this.walletServiceUrl || !authHeader) return [];

    const transactions: WalletTransaction[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = new URL(`${this.walletServiceUrl}/wallet/transactions`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', '100');
      if (type) {
        url.searchParams.set('type', type);
      }

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            authorization: authHeader,
          },
        });
      } catch {
        break;
      }

      if (!response.ok) {
        break;
      }

      let payload: WalletTransactionsResponse;
      try {
        payload = (await response.json()) as WalletTransactionsResponse;
      } catch {
        break;
      }
      if (Array.isArray(payload.data)) {
        transactions.push(...payload.data);
      }

      totalPages = payload.pagination?.totalPages ?? page;
      page += 1;
    }

    return transactions;
  }

  private toLocalDate(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  private getYearInTimezone(date: Date, timeZone: string): number {
    if (Number.isNaN(date.getTime())) {
      return Number.NaN;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
    });
    return Number(formatter.format(date));
  }

  // ── Online Status Tracking ───────────────────────────────

  async recordHeartbeat(userId: string) {
    await this.findById(userId);
    const heartbeat = await this.prisma.userHeartbeat.upsert({
      where: { userId },
      update: { lastSeen: new Date() },
      create: { userId, lastSeen: new Date() },
    });

    return {
      success: true,
      data: { userId, lastSeen: heartbeat.lastSeen },
    };
  }

  async getOnlineUsers(limit = 100, ids?: string[]) {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    const normalizedIds = Array.isArray(ids)
      ? Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
      : [];

    const heartbeats = await this.prisma.userHeartbeat.findMany({
      where: {
        lastSeen: { gte: sixtySecondsAgo },
        ...(normalizedIds.length ? { userId: { in: normalizedIds } } : {}),
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { lastSeen: 'desc' },
      take: limit,
    });

    const onlineUsers = heartbeats.map((hb) => ({
      id: hb.user.id,
      username: hb.user.username,
      avatarUrl: hb.user.avatarUrl,
      lastSeen: hb.lastSeen,
    }));

    return {
      success: true,
      onlineUsers,
      count: onlineUsers.length,
      timestamp: new Date(),
      data: {
        onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date(),
      },
    };
  }
}