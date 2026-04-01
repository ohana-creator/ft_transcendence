import { IsString, IsOptional, IsDateString, IsBoolean, IsNumber, MinLength, MaxLength, Min, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  goalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  goalVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
