import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
  Req,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { ContributeDto } from './dto/contribute.dto';
import { InviteDto } from './dto/invite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';

type CampaignImageHandler = {
  saveCampaignImage: (userId: string, file: MultipartFile) => Promise<string>;
};

const CAMPAIGN_IMAGE_SERVICE = 'CAMPAIGN_IMAGE_SERVICE';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    @Inject(CAMPAIGN_IMAGE_SERVICE)
    private readonly campaignImageService: CampaignImageHandler,
  ) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload campaign image (JPG/PNG/WebP, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadImage(
    @CurrentUser() user: { userId: string },
    @Req() req: FastifyRequest,
  ) {
    console.log('[UPLOAD CONTROLLER] Iniciando upload de imagem para userId:', user.userId);
    console.log('[UPLOAD CONTROLLER] Headers da requisição:', req.headers);
    
    const file = await req.file();
    console.log('[UPLOAD CONTROLLER] Arquivo recebido:', {
      fieldname: file?.fieldname,
      filename: file?.filename,
      encoding: file?.encoding,
      mimetype: file?.mimetype
    });
    
    if (!file) {
      console.error('[UPLOAD CONTROLLER] Erro: Nenhum arquivo fornecido');
      throw new BadRequestException('No file provided');
    }
    
    console.log('[UPLOAD CONTROLLER] Chamando saveCampaignImage...');
    const imageUrl = await this.campaignImageService.saveCampaignImage(
      user.userId,
      file,
    );
    console.log('[UPLOAD CONTROLLER] Upload concluído com sucesso, URL:', imageUrl);
    
    return { imageUrl };
  }
}

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    @Inject(CAMPAIGN_IMAGE_SERVICE)
    private readonly campaignImageService: CampaignImageHandler,
  ) {}

  @Post('upload/image')
  @ApiOperation({ summary: 'Upload campaign image (JPG/PNG/WebP, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadImage(
    @CurrentUser() user: { userId: string },
    @Req() req: FastifyRequest,
  ) {
    console.log('[CAMPAIGN CONTROLLER] Iniciando upload de imagem para userId:', user.userId);
    console.log('[CAMPAIGN CONTROLLER] Headers da requisição:', req.headers);
    
    const file = await req.file();
    console.log('[CAMPAIGN CONTROLLER] Arquivo recebido:', {
      fieldname: file?.fieldname,
      filename: file?.filename,
      encoding: file?.encoding,
      mimetype: file?.mimetype
    });
    
    if (!file) {
      console.error('[CAMPAIGN CONTROLLER] Erro: Nenhum arquivo fornecido');
      throw new BadRequestException('No file provided');
    }
    
    console.log('[CAMPAIGN CONTROLLER] Chamando saveCampaignImage...');
    const imageUrl = await this.campaignImageService.saveCampaignImage(
      user.userId,
      file,
    );
    console.log('[CAMPAIGN CONTROLLER] Upload concluído com sucesso, URL:', imageUrl);
    
    return { imageUrl };
  }

  @Post()
  @ApiOperation({ summary: 'Create campaign' })
  create(
    @CurrentUser() user: { userId: string; email: string; username: string },
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(user.userId, user.username, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns (public + private where member)' })
  findAll(
    @Query() dto: ListCampaignsDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.campaignsService.findAll(dto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.campaignsService.findOne(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign (SUDO/owner only)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Close campaign (owner only)' })
  close(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.campaignsService.close(id, user.userId);
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Contribute to campaign' })
  contribute(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: ContributeDto,
  ) {
    return this.campaignsService.contribute(id, user.userId, dto);
  }

  // Members
  @Get(':id/members')
  @ApiOperation({ summary: 'List members (paginated, visibility-checked)' })
  getMembers(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.campaignsService.getMembers(id, user.userId, page, limit);
  }

  @Post(':id/members/:userId/promote')
  @ApiOperation({ summary: 'Promote member to SUDO' })
  promote(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.campaignsService.promoteMember(id, targetUserId, user.userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.campaignsService.removeMember(id, targetUserId, user.userId);
  }

  // Invitations
  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite user to private campaign' })
  invite(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; username: string },
    @Body() dto: InviteDto,
  ) {
    return this.campaignsService.invite(id, user.userId, user.username, dto);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List invitations (members only)' })
  getInvitations(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.campaignsService.getInvitations(id, user.userId);
  }
}

// ── Separate controller for invitation responses ──────────
// Mounted at /invitations to match the spec path: POST /invitations/:id/accept

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept invitation' })
  accept(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.campaignsService.respondInvitation(
      id,
      user.userId,
      user.username,
      true,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject invitation' })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.campaignsService.respondInvitation(
      id,
      user.userId,
      user.username,
      false,
    );
  }
}
