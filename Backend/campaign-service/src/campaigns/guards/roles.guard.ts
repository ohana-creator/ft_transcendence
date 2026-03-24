import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

export const ROLES_KEY = 'roles';
export type CampaignRole = 'OWNER' | 'SUDO' | 'VAKER' | 'ANY';

@Injectable()
export class CampaignRolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<CampaignRole[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const campaignId = request.params?.id;

    if (!userId || !campaignId) throw new ForbiddenException('Unauthorized');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (requiredRoles.includes('ANY')) return true;

    if (requiredRoles.includes('OWNER') && campaign.ownerId === userId) return true;

    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });

    if (!member) throw new ForbiddenException('You are not a member of this campaign');

    if (requiredRoles.includes('SUDO') && (campaign.ownerId === userId || member.role === 'SUDO')) return true;
    if (requiredRoles.includes('VAKER')) return true;

    throw new ForbiddenException('Insufficient permissions');
  }
}
