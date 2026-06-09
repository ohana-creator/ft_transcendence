import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListFriendRequestsDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing'], default: 'incoming' })
  @IsOptional()
  @IsIn(['incoming', 'outgoing'])
  direction?: 'incoming' | 'outgoing' = 'incoming';

  @ApiPropertyOptional({ enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED'], default: 'PENDING' })
  @IsOptional()
  @IsIn(['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED'])
  status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' = 'PENDING';
}
