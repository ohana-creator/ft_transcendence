import { IsNumber, IsOptional, IsString, Min, MaxLength, IsBoolean, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const MAX_CONTRIBUTION_AMOUNT = 1_000_000;

export class ContributeDto {
  @ApiProperty({ description: 'Valor a contribuir (max 1.000.000)', example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(MAX_CONTRIBUTION_AMOUNT, { message: 'Valor maximo permitido: 1000000' })
  amount: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
