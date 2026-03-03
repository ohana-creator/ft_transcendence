import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, ParseIntPipe,
  HttpCode, HttpStatus, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { ContributeDto } from './dto/contribute.dto';
import { InviteDto } from './dto/invite.dto';

// During development, userId comes from x-user-id header (API Gateway will replace with JWT)
@ApiTags('campaigns')
@ApiBearerAuth()
@ApiHeader({ name: 'x-user-id', description: 'User ID (dev only)', required: false })
@ApiHeader({ name: 'x-username', description: 'Username (dev only)', required: false })
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create campaign' })
  create(
    @Headers('x-user-id') userId: string,
    @Headers('x-username') username: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(parseInt(userId), username, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List public campaigns' })
  findAll(@Query() dto: ListCampaignsDto) {
    return this.campaignsService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.campaignsService.findOne(id, userId ? parseInt(userId) : undefined);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign (SUDO/owner only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, parseInt(userId), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Close campaign (owner only)' })
  close(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
  ) {
    return this.campaignsService.close(id, parseInt(userId));
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Contribute to campaign' })
  contribute(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
    @Body() dto: ContributeDto,
  ) {
    return this.campaignsService.contribute(id, parseInt(userId), dto);
  }

  // Members
  @Get(':id/members')
  @ApiOperation({ summary: 'List members (paginated)' })
  getMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.campaignsService.getMembers(id, page, limit);
  }

  @Post(':id/members/:userId/promote')
  @ApiOperation({ summary: 'Promote member to SUDO' })
  promote(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Headers('x-user-id') requesterId: string,
  ) {
    return this.campaignsService.promoteMember(id, targetUserId, parseInt(requesterId));
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Headers('x-user-id') requesterId: string,
  ) {
    return this.campaignsService.removeMember(id, targetUserId, parseInt(requesterId));
  }

  // Invitations
  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite user to private campaign' })
  invite(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') inviterId: string,
    @Headers('x-username') inviterName: string,
    @Body() dto: InviteDto,
  ) {
    return this.campaignsService.invite(id, parseInt(inviterId), inviterName, dto);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List invitations' })
  getInvitations(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.getInvitations(id);
  }

  @Post('invitations/:id/accept')
  @ApiOperation({ summary: 'Accept invitation' })
  accept(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
  ) {
    return this.campaignsService.respondInvitation(id, parseInt(userId), true);
  }

  @Post('invitations/:id/reject')
  @ApiOperation({ summary: 'Reject invitation' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
  ) {
    return this.campaignsService.respondInvitation(id, parseInt(userId), false);
  }
}
