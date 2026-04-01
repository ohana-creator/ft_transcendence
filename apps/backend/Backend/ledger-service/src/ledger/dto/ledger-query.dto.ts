import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LedgerQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(['MINT','TRANSFER','BURN'])
  operation?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}