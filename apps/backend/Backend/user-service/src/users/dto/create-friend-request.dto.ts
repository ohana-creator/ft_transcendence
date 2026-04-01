import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateFriendRequestDto {
  @ApiPropertyOptional({ description: 'Target user id (UUID)' })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o: CreateFriendRequestDto) => !o.targetUsername)
  targetUserId?: string;

  @ApiPropertyOptional({ description: 'Target username' })
  @IsOptional()
  @IsString()
  @ValidateIf((o: CreateFriendRequestDto) => !o.targetUserId)
  targetUsername?: string;
}
