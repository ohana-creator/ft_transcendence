import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto, SortBy } from './dto/list-campaigns.dto';
import { ContributeDto } from './dto/contribute.dto';
import { InviteDto } from './dto/invite.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  private normalizeAmount(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value && typeof (value as { toString?: () => string }).toString === 'function') {
      const parsed = Number((value as { toString: () => string }).toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeCampaign<T extends { goalAmount: unknown; currentAmount: unknown }>(campaign: T): Omit<T, 'goalAmount' | 'currentAmount'> & { goalAmount: number; currentAmount: number } {
    return {
      ...campaign,
      goalAmount: this.normalizeAmount(campaign.goalAmount),
      currentAmount: this.normalizeAmount(campaign.currentAmount),
    };
  }

  async create(userId: string, username: string, dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isPrivate: dto.isPrivate ?? false,
        goalAmount: dto.goalAmount,
        goalVisible: dto.goalVisible ?? true,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        ownerId: userId,
        ownerUsername: username,
        members: { create: { userId, username, role: 'SUDO' } },
      },
      include: { members: true },
    });

    await this.prisma.wallet.upsert({
      where: { campaignId: campaign.id },
      update: {},
      create: { campaignId: campaign.id, balance: 0 },
    });

    await this.notifyCampaignOwner(campaign.ownerId, {
      type: 'CAMPAIGN_CONTRIBUTION',
      title: 'Campaign Created',
      message: `Your campaign "${campaign.title}" has been created successfully.`,
      metadata: { campaignId: campaign.id },
    });

    return campaign;
  }

  async findAll(dto: ListCampaignsDto, userId?: string) {
    const { search, status, sortBy = SortBy.CREATED_AT, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) {
      where.OR = [
        { isPrivate: false },
        { isPrivate: true, members: { some: { userId } } },
      ];
    } else {
      where.isPrivate = false;
    }

    if (status) where.status = status;
    if (search) {
      const searchCondition = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          isPrivate: true,
          goalAmount: true,
          goalVisible: true,
          currentAmount: true,
          deadline: true,
          ownerId: true,
          ownerUsername: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map((campaign) => this.normalizeCampaign(campaign)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId?: string) {
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

    return this.normalizeCampaign(campaign);
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: id, userId } },
    });
    const isSudo = campaign.ownerId === userId || member?.role === 'SUDO';
    if (!isSudo) throw new ForbiddenException('Only SUDO or owner can edit');

    const { deadline, ...rest } = dto;
    return this.prisma.campaign.update({
      where: { id },
      data: { ...rest, deadline: deadline ? new Date(deadline) : undefined },
    });
  }

  async close(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.ownerId !== userId) throw new ForbiddenException('Only owner can close campaign');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', closedAt: new Date() },
    });

    await this.prisma.wallet.deleteMany({ where: { campaignId: updated.id } });

    await this.notifyCampaignOwner(updated.ownerId, {
      type: 'CAMPAIGN_CLOSED',
      title: 'Campaign Closed',
      message: `Campaign "${updated.title}" has been closed.`,
      metadata: { campaignId: updated.id },
    });

    return updated;
  }

  async contribute(id: string, userId: string, username: string, dto: ContributeDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Campaign is not active');

    if (campaign.isPrivate) {
      const isMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: id, userId } },
      });
      if (!isMember) throw new ForbiddenException('Only members can contribute to private campaigns');
    }

    const normalizedMessage = dto.message?.trim() ? dto.message.trim() : null;
    const walletPayload = {
      userId,
      campaignId: id,
      amount: dto.amount,
      campaignTitle: campaign.title,
    };

    try {
      await this.walletService.contributeToCampaign(walletPayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Wallet debit failed for campaign ${id}: ${message}`);
      throw error;
    }

    let result: { updated: any; goalReached: boolean; contribution: any };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.campaign.update({
          where: { id },
          data: { currentAmount: { increment: dto.amount } },
        });
        if (!updated) throw new NotFoundException('Campaign not found');

        if (updated.status !== 'ACTIVE') {
          throw new BadRequestException('Campaign is no longer active');
        }

        const contribution = await tx.contribution.create({
          data: {
            campaignId: id,
            userId,
            username,
            amount: dto.amount,
            message: normalizedMessage,
            isAnonymous: dto.isAnonymous ?? false,
          },
        });

        let goalReached = false;
        const newAmount = Number(updated.currentAmount);
        if (updated.goalAmount && newAmount >= Number(updated.goalAmount)) {
          await tx.campaign.update({ where: { id }, data: { status: 'COMPLETED' } });
          goalReached = true;
        }

        return { updated, goalReached, contribution };
      });
    } catch (dbError) {
      this.logger.error(
        `Campaign DB update failed for ${id} after wallet debit — initiating refund`,
        dbError,
      );

      try {
        await this.walletService.refundContribution(walletPayload);
        this.logger.log(`Saga refund succeeded for campaign ${id}, userId=${userId}`);
      } catch (refundError) {
        this.logger.error(
          `CRITICAL: Saga refund FAILED for campaign ${id}, userId=${userId}, amount=${dto.amount}. Manual intervention required.`,
          refundError,
        );
      }

      throw dbError;
    }

    await this.notifications.create({
      userId,
      type: 'CAMPAIGN_CONTRIBUTION',
      title: 'Contribution Confirmed',
      message: `Your contribution of ${dto.amount} VAKS has been confirmed.`,
      metadata: {
        campaignId: id,
        transactionId: result.contribution.id,
        amount: dto.amount,
      },
    });

    if (result.goalReached) {
      await this.notifications.create({
        userId: campaign.ownerId,
        type: 'CAMPAIGN_GOAL_REACHED',
        title: 'Goal Reached!',
        message: `Campaign "${campaign.title}" has reached its funding goal!`,
        metadata: { campaignId: id },
      });
    }

    return {
      success: true,
      currentAmount: result.updated.currentAmount,
      contribution: {
        id: result.contribution.id,
        amount: result.contribution.amount,
        message: result.contribution.message,
        isAnonymous: result.contribution.isAnonymous,
        createdAt: result.contribution.createdAt,
      },
    };
  }

  async getContributions(id: string, userId: string, page = 1, limit = 10) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.isPrivate) {
      const isMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: id, userId } },
      });
      if (!isMember) throw new ForbiddenException('This campaign is private');
    }

    const skip = (page - 1) * limit;
    const [contributions, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          username: true,
          amount: true,
          message: true,
          isAnonymous: true,
          createdAt: true,
        },
      }),
      this.prisma.contribution.count({ where: { campaignId: id } }),
    ]);

    const mappedContributions = contributions.map((c) => ({
      id: c.id,
      campaignId: id,
      userId: c.isAnonymous ? null : c.userId,
      username: c.isAnonymous ? 'Anónimo' : c.username,
      amount: this.normalizeAmount(c.amount),
      message: c.message,
      isAnonymous: c.isAnonymous,
      createdAt: c.createdAt,
    }));

    return {
      contributions: mappedContributions,
      data: mappedContributions,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: {
        currentAmount: this.normalizeAmount(campaign.currentAmount),
        goalAmount: campaign.goalAmount ? this.normalizeAmount(campaign.goalAmount) : null,
      },
    };
  }

  async getMembers(id: string, userId: string, page = 1, limit = 10) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.isPrivate) {
      const isMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: id, userId } },
      });
      if (!isMember) throw new ForbiddenException('This campaign is private');
    }

    const skip = (page - 1) * limit;
    const [members, total] = await Promise.all([
      this.prisma.campaignMember.findMany({ where: { campaignId: id }, skip, take: limit }),
      this.prisma.campaignMember.count({ where: { campaignId: id } }),
    ]);

    return { members, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async promoteMember(campaignId: string, targetUserId: string, requesterId: string) {
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

  async removeMember(campaignId: string, targetUserId: string, requesterId: string) {
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

  async invite(campaignId: string, inviterId: string, inviterName: string, dto: InviteDto) {
    if (!dto.userId && !dto.email) throw new BadRequestException('Provide userId or email');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const inviterMember = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: inviterId } },
    });
    const canInvite = campaign.ownerId === inviterId || inviterMember?.role === 'SUDO';
    if (!canInvite) throw new ForbiddenException('Only SUDO or owner can invite');

    if (dto.userId) {
      const existingMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId, userId: dto.userId } },
      });
      if (existingMember) throw new ConflictException('User is already a member');

      const existingInvite = await this.prisma.invitation.findFirst({
        where: { campaignId, invitedUserId: dto.userId, status: 'PENDING' },
      });
      if (existingInvite) throw new ConflictException('User already has a pending invitation');
    }

    if (dto.email) {
      const existingInvite = await this.prisma.invitation.findFirst({
        where: { campaignId, invitedEmail: dto.email, status: 'PENDING' },
      });
      if (existingInvite) throw new ConflictException('Email already has a pending invitation');
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        campaignId,
        inviterId,
        inviterName,
        invitedUserId: dto.userId,
        invitedEmail: dto.email,
      },
    });

    if (invitation.invitedUserId) {
      await this.notifications.create({
        userId: invitation.invitedUserId,
        type: 'CAMPAIGN_INVITE',
        title: 'Campaign Invitation',
        message: `${inviterName} invited you to join campaign "${campaign.title}".`,
        metadata: { campaignId, invitationId: invitation.id },
      });
    }

    return invitation;
  }

  async getInvitations(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const isMember = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (!isMember && campaign.ownerId !== userId) {
      throw new ForbiddenException('Only members can view invitations');
    }

    return this.prisma.invitation.findMany({ where: { campaignId } });
  }

  async getPendingInvitations(userId: string, email: string) {
    return this.prisma.invitation.findMany({
      where: {
        status: 'PENDING',
        OR: [{ invitedUserId: userId }, { invitedEmail: email }],
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            ownerUsername: true,
            isPrivate: true,
          },
        },
      },
    });
  }

  async respondInvitation(invitationId: string, userId: string, email: string, username: string, accept: boolean) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException('Invitation not found');

    const isUserInvitation = invitation.invitedUserId === userId || invitation.invitedEmail === email;
    if (!isUserInvitation) throw new ForbiddenException('Not your invitation');

    if (invitation.status !== 'PENDING') {
      return {
        ...invitation,
        alreadyResponded: true,
        message: 'Invitation was already responded',
      };
    }

    if (accept) {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: invitation.campaignId } });
      if (!campaign) throw new NotFoundException('Campaign not found');

      await this.prisma.campaignMember.upsert({
        where: { campaignId_userId: { campaignId: invitation.campaignId, userId } },
        update: { role: 'VAKER' },
        create: {
          campaignId: invitation.campaignId,
          userId,
          username,
          role: 'VAKER',
        },
      });
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED', respondedAt: new Date() },
    });
  }

  async handleUserUpdated(payload: { id: string; username: string }) {
    await this.prisma.campaignMember.updateMany({
      where: { userId: payload.id },
      data: { username: payload.username },
    });

    await this.prisma.campaign.updateMany({
      where: { ownerId: payload.id },
      data: { ownerUsername: payload.username },
    });
  }

  private async notifyCampaignOwner(
    userId: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      metadata?: Record<string, any>;
    },
  ) {
    try {
      await this.notifications.create({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
      });
    } catch (error) {
      this.logger.warn(`Failed to create campaign notification: ${String(error)}`);
    }
  }
}