import { IsString, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCampaignDto {
  @ApiPropertyOptional({ minLength: 5, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ minLength: 20, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
