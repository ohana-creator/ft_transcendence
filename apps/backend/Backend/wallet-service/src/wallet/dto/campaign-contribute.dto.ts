import { IsUUID, IsNumber, IsPositive, IsOptional, IsString, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_CAMPAIGN_CONTRIBUTION = 1_000_000;

export class CampaignContributeDto {
  @ApiProperty({ description: 'ID do utilizador que contribui (UUID)' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'ID da campanha (UUID)' })
  @IsUUID()
  campaignId!: string;

  @ApiProperty({ description: 'Montante a contribuir (max 2 casas decimais, max 1.000.000)', example: 50.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_CAMPAIGN_CONTRIBUTION, { message: 'Valor maximo permitido: 1000000' })
  amount!: number;

  @ApiPropertyOptional({ description: 'Título da campanha (para metadata)' })
  @IsOptional()
  @IsString()
  campaignTitle?: string;
}
