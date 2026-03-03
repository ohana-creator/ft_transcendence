import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto, SortBy } from './dto/list-campaigns.dto';
import { ContributeDto } from './dto/contribute.dto';
import { InviteDto } from './dto/invite.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: number, username: string, dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title,
        description: dto.description,
        isPrivate: dto.isPrivate ?? false,
        goalAmount: dto.goalAmount,
        goalVisible: dto.goalVisible ?? true,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        ownerId: userId,
        ownerUsername: username,
        members: {
          create: { userId, username, role: 'SUDO' },
        },
      },
      include: { members: true },
    });
    this.eventEmitter.emit('campaign.created', campaign);
    return campaign;
  }

  async findAll(dto: ListCampaignsDto) {
    const { search, status, sortBy = SortBy.CREATED_AT, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: any = { isPrivate: false };
    if (status) where.status = status;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: 'desc' },
        select: {
          id: true, title: true, description: true, isPrivate: true,
          goalAmount: true, goalVisible: true, currentAmount: true,
          deadline: true, ownerId: true, ownerUsername: true,
          status: true, createdAt: true,
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, userId?: number) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.isPrivate) {
      if (!userId) throw new ForbiddenException('This campaign is private');
      const isMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: id, userId } },
      });
      if (!isMember) throw new ForbiddenException('This campaign is private');
    }

    return campaign;
  }

  async update(id: number, userId: number, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: id, userId } },
    });
    const isSudo = campaign.ownerId === userId || member?.role === 'SUDO';
    if (!isSudo) throw new ForbiddenException('Only SUDO or owner can edit');

    return this.prisma.campaign.update({
      where: { id },
      data: { ...dto, deadline: dto.deadline ? new Date(dto.deadline) : undefined },
    });
  }

  async close(id: number, userId: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.ownerId !== userId) throw new ForbiddenException('Only owner can close campaign');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', closedAt: new Date() },
    });
    this.eventEmitter.emit('campaign.closed', updated);
    return updated;
  }

  async contribute(id: number, userId: number, dto: ContributeDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Campaign is not active');

    if (campaign.isPrivate) {
      const isMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: id, userId } },
      });
      if (!isMember) throw new ForbiddenException('Only members can contribute to private campaigns');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { currentAmount: { increment: dto.amount } },
    });

    this.eventEmitter.emit('contribution.completed', { campaignId: id, userId, amount: dto.amount });

    if (campaign.goalAmount && updated.currentAmount >= campaign.goalAmount) {
      await this.prisma.campaign.update({ where: { id }, data: { status: 'COMPLETED' } });
      this.eventEmitter.emit('goal.reached', { campaignId: id, goalAmount: campaign.goalAmount });
    }

    return { success: true, currentAmount: updated.currentAmount };
  }

  // --- Members ---
  async getMembers(id: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [members, total] = await Promise.all([
      this.prisma.campaignMember.findMany({ where: { campaignId: id }, skip, take: limit }),
      this.prisma.campaignMember.count({ where: { campaignId: id } }),
    ]);
    return { members, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async promoteMember(campaignId: number, targetUserId: number, requesterId: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const requester = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: requesterId } },
    });
    const canPromote = campaign.ownerId === requesterId || requester?.role === 'SUDO';
    if (!canPromote) throw new ForbiddenException('Only SUDO or owner can promote');

    return this.prisma.campaignMember.update({
      where: { campaignId_userId: { campaignId, userId: targetUserId } },
      data: { role: 'SUDO' },
    });
  }

  async removeMember(campaignId: number, targetUserId: number, requesterId: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.ownerId === targetUserId) throw new ForbiddenException('Cannot remove the owner');

    const requester = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: requesterId } },
    });
    const canRemove = campaign.ownerId === requesterId || requester?.role === 'SUDO';
    if (!canRemove) throw new ForbiddenException('Only SUDO or owner can remove members');

    return this.prisma.campaignMember.delete({
      where: { campaignId_userId: { campaignId, userId: targetUserId } },
    });
  }

  // --- Invitations ---
  async invite(campaignId: number, inviterId: number, inviterName: string, dto: InviteDto) {
    if (!dto.userId && !dto.email) throw new BadRequestException('Provide userId or email');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.prisma.invitation.create({
      data: {
        campaignId,
        inviterId,
        inviterName,
        invitedUserId: dto.userId,
        invitedEmail: dto.email,
      },
    });
  }

  async getInvitations(campaignId: number) {
    return this.prisma.invitation.findMany({ where: { campaignId } });
  }

  async respondInvitation(invitationId: number, userId: number, accept: boolean) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.invitedUserId !== userId) throw new ForbiddenException('Not your invitation');
    if (invitation.status !== 'PENDING') throw new BadRequestException('Invitation already responded');

    if (accept) {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: invitation.campaignId } });
      if (!campaign) throw new NotFoundException('Campaign not found');

      await this.prisma.campaignMember.create({
        data: {
          campaignId: invitation.campaignId,
          userId,
          username: '',
          role: 'VAKER',
        },
      });
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED', respondedAt: new Date() },
    });
  }

  async handleUserUpdated(payload: { id: number; username: string }) {
    await this.prisma.campaignMember.updateMany({
      where: { userId: payload.id },
      data: { username: payload.username },
    });
  }
}
