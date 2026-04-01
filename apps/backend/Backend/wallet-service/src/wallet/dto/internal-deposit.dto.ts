import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DepositDto } from './deposit.dto.js';

export class InternalDepositDto extends DepositDto {
  @ApiProperty({ description: 'ID do utilizador destinatário (UUID)' })
  @IsUUID()
  userId!: string;
}
