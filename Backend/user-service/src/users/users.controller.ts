import {
  Controller, Get, Put, Post, Delete,
  Param, Query, Body, ParseIntPipe,
  HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AvatarService } from './avatar/avatar.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload avatar (JPG/PNG, max 5MB)' })
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) throw new Error('No file provided');
    const avatarUrl = await this.avatarService.saveAvatar(id, file);
    return this.usersService.updateAvatar(id, avatarUrl);
  }

  @Delete(':id/avatar')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove avatar' })
  async removeAvatar(@Param('id', ParseIntPipe) id: number) {
    this.avatarService.deleteAvatarFile(id);
    return this.usersService.removeAvatar(id);
  }
}