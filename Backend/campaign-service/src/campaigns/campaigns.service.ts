import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto, SortBy } from './dto/list-campaigns.dto';
import { ContributeDto } from './dto/contribute.dto';
import { InviteDto } from './dto/invite.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly walletServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.walletServiceUrl = this.config.get<string>('WALLET_SERVICE_URL', 'http://wallet-service:3005');
    this.internalApiKey = this.config.getOrThrow<string>('INTERNAL_API_KEY');
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
        members: {
          create: { userId, username, role: 'SUDO' },
        },
      },
      include: { members: true },
    });
    await this.redis.publish('campaign-events', 'campaign.created', campaign);
    return campaign;
  }

  // ── List campaigns ───────────────────────────────────────
  // Shows public campaigns + private campaigns where the user is a member

  async findAll(dto: ListCampaignsDto, userId?: string) {
    const { search, status, sortBy = SortBy.CREATED_AT, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Public campaigns OR private campaigns where user is a member
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
      // Wrap existing OR conditions with AND to combine search + visibility
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
          id: true, title: true, description: true, imageUrl: true, isPrivate: true,
          goalAmount: true, goalVisible: true, currentAmount: true,
          deadline: true, ownerId: true, ownerUsername: true,
          status: true, createdAt: true,
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
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

    return campaign;
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
    await this.redis.publish('campaign-events', 'campaign.closed', updated);
    return updated;
  }

  // ── Contribute ───────────────────────────────────────────
  // 1. Calls Wallet Service to debit funds (REST)
  // 2. Updates campaign currentAmount in local DB
  // 3. Publishes contribution.completed event

  async contribute(id: string, userId: string, dto: ContributeDto) {
    // Validate campaign state before calling Wallet Service
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Campaign is not active');

    if (campaign.isPrivate) {
      const isMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: id, userId } },
      });
      if (!isMember) throw new ForbiddenException('Only members can contribute to private campaigns');
    }

    // ── Step 1: Call Wallet Service to debit funds ──────────
    const walletPayload = {
      userId,
      campaignId: id,
      amount: dto.amount,
      campaignTitle: campaign.title,
    };

    const walletResponse = await fetch(`${this.walletServiceUrl}/wallet/campaign/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': this.internalApiKey,
      },
      body: JSON.stringify(walletPayload),
    });

    if (!walletResponse.ok) {
      const error = await walletResponse.json().catch(() => ({}));
      const message = error.message || 'Failed to debit funds from wallet';
      this.logger.error(`Wallet debit failed for campaign ${id}: ${message}`);
      throw new BadRequestException(message);
    }

    // ── Step 2: Update campaign progress (with saga compensation) ──
    let result: { updated: any; goalReached: boolean };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.campaign.update({
          where: { id },
          data: { currentAmount: { increment: dto.amount } },
        });
        if (!updated) throw new NotFoundException('Campaign not found');

        // Re-validate campaign is still active inside the transaction
        if (updated.status !== 'ACTIVE') {
          throw new BadRequestException('Campaign is no longer active');
        }

        // Auto-complete if goal reached
        let goalReached = false;
        const newAmount = Number(updated.currentAmount);
        if (updated.goalAmount && newAmount >= Number(updated.goalAmount)) {
          await tx.campaign.update({ where: { id }, data: { status: 'COMPLETED' } });
          goalReached = true;
        }

        return { updated, goalReached };
      });
    } catch (dbError) {
      // ── Saga Compensation: refund wallet if campaign DB update failed ──
      this.logger.error(
        `Campaign DB update failed for ${id} after wallet debit — initiating refund`,
        dbError,
      );

      try {
        await fetch(`${this.walletServiceUrl}/wallet/campaign/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': this.internalApiKey,
          },
          body: JSON.stringify(walletPayload),
        });
        this.logger.log(`Saga refund succeeded for campaign ${id}, userId=${userId}`);
      } catch (refundError) {
        // Critical: the refund itself failed — needs manual intervention
        this.logger.error(
          `CRITICAL: Saga refund FAILED for campaign ${id}, userId=${userId}, amount=${dto.amount}. Manual intervention required.`,
          refundError,
        );
      }

      throw dbError;
    }

    // ── Step 3: Publish events outside the transaction ──────
    await this.redis.publish('campaign-events', 'contribution.completed', {
      campaignId: id,
      userId,
      amount: dto.amount,
      message: dto.message ?? null,
    });

    if (result.goalReached) {
      await this.redis.publish('campaign-events', 'goal.reached', {
        campaignId: id,
        goalAmount: campaign.goalAmount,
      });
    }

    return { success: true, currentAmount: result.updated.currentAmount };
  }

  // ── Members ──────────────────────────────────────────────

  async getMembers(id: string, userId: string, page = 1, limit = 10) {
    // Verify the campaign exists and user has visibility
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

  // ── Invitations ──────────────────────────────────────────

  async invite(campaignId: string, inviterId: string, inviterName: string, dto: InviteDto) {
    if (!dto.userId && !dto.email) throw new BadRequestException('Provide userId or email');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Verify that the inviter is a member with permissions
    const inviterMember = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: inviterId } },
    });
    const canInvite = campaign.ownerId === inviterId || inviterMember?.role === 'SUDO';
    if (!canInvite) throw new ForbiddenException('Only SUDO or owner can invite');

    // Check if user is already a member
    if (dto.userId) {
      const existingMember = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId, userId: dto.userId } },
      });
      if (existingMember) throw new ConflictException('User is already a member');

      // Check if there's already a pending invitation for this user
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

  async getInvitations(campaignId: string, userId: string) {
    // Only members/owner can see invitations
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
        OR: [
          { invitedUserId: userId },
          { invitedEmail: email }
        ]
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            ownerUsername: true,
            isPrivate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async respondInvitation(invitationId: string, userId: string, email: string, username: string, accept: boolean) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    
    // Check if invitation is for this user (by ID OR email)
    const isUserInvitation = invitation.invitedUserId === userId || invitation.invitedEmail === email;
    if (!isUserInvitation) throw new ForbiddenException('Not your invitation');
    
    if (invitation.status !== 'PENDING') throw new BadRequestException('Invitation already responded');

    if (accept) {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: invitation.campaignId } });
      if (!campaign) throw new NotFoundException('Campaign not found');

      // Use upsert to handle edge case where member was re-invited after removal
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
    // Update username in campaign members
    await this.prisma.campaignMember.updateMany({
      where: { userId: payload.id },
      data: { username: payload.username },
    });

    // Update ownerUsername in campaigns owned by this user
    await this.prisma.campaign.updateMany({
      where: { ownerId: payload.id },
      data: { ownerUsername: payload.username },
    });
  }
}
