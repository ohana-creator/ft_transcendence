import { IsUUID, IsNumber, IsPositive, IsOptional, IsString, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ description: 'ID do utilizador destinatário (UUID)' })
  @IsUUID()
  toUserId!: string;

  @ApiProperty({ description: 'Montante a transferir (max 2 casas decimais, max 1.000.000)', example: 100.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: 'Nota opcional' })
  @IsOptional()
  @IsString()
  note?: string;
}
