import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, avatarUrl: true, bio: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...user,
      avatarUrl: user.avatarUrl || '/uploads/avatars/default.jpg',
    };
  }

  async update(id: number, dto: UpdateUserDto) {
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

    this.eventEmitter.emit('user.updated', updated);
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

    return { users: users.map(u => ({ ...u, avatarUrl: u.avatarUrl || '/uploads/avatars/default.jpg' })), meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateAvatar(id: number, avatarUrl: string) {
    await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
    this.eventEmitter.emit('user.updated', updated);
    return updated;
  }

  async removeAvatar(id: number) {
    await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: { id: true, avatarUrl: true },
    });
    this.eventEmitter.emit('user.updated', updated);
    return updated;
  }

  async createFromEvent(data: { id: number; email: string; username: string }) {
    return this.prisma.user.upsert({
      where: { id: data.id },
      update: {},
      create: { id: data.id, email: data.email, username: data.username },
    });
  }
}