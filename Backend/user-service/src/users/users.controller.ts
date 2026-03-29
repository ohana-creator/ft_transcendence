import {
  Controller, Get, Put, Post, Delete,
  Param, Query, Body, Req,
  HttpCode, HttpStatus, UseGuards,
  ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AvatarService } from './avatar/avatar.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { HeatmapQueryDto } from './dto/heatmap-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { FastifyRequest } from 'fastify';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarService: AvatarService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or email' })
  search(@Query() dto: SearchUsersDto) {
    return this.usersService.search(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile stats for authenticated user' })
  getMyStats(
    @CurrentUser() user: { userId: string },
    @Req() req: FastifyRequest,
  ) {
    const authHeader = typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : undefined;
    return this.usersService.getProfileStats(user.userId, authHeader);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/contributions/heatmap')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contribution heatmap (year/month)' })
  getMyContributionHeatmap(
    @CurrentUser() user: { userId: string },
    @Query() query: HeatmapQueryDto,
    @Req() req: FastifyRequest,
  ) {
    const authHeader = typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : undefined;
    return this.usersService.getContributionHeatmap(user.userId, query, authHeader);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/contributions/years')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get years with user contributions' })
  getMyContributionYears(
    @Req() req: FastifyRequest,
  ) {
    const authHeader = typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : undefined;
    return this.usersService.getContributionYears(authHeader);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto,
  ) {
    if (user.userId !== id) throw new ForbiddenException('You can only update your own profile');
    return this.usersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload avatar (JPG/PNG, max 5MB)' })
  async uploadAvatar(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Req() req: FastifyRequest,
  ) {
    if (user.userId !== id) throw new ForbiddenException('You can only update your own avatar');
    const file = await req.file();
    if (!file) throw new BadRequestException('No file provided');
    const avatarUrl = await this.avatarService.saveAvatar(id, file);
    return this.usersService.updateAvatar(id, avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/avatar')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove avatar' })
  async removeAvatar(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    if (user.userId !== id) throw new ForbiddenException('You can only delete your own avatar');
    await this.avatarService.deleteAvatarFiles(id);
    return this.usersService.removeAvatar(id);
  }
}