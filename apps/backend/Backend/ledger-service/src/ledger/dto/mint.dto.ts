import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MintDto {
  @ApiProperty() @IsString()
  userId: string;

  @ApiProperty() @IsString()
  walletAddress: string;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.000001)
  amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  ref?: string;
}