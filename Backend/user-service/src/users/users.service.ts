import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class UsersService {
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
}