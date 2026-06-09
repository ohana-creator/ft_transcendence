import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { DepositDto } from './deposit.dto.js';

export class ConfirmTopupDto extends DepositDto {
  @ApiProperty({ description: 'ID do utilizador destinatario (UUID)' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Referencia do checkout retornada no topup inicial' })
  @IsString()
  reference!: string;
}
