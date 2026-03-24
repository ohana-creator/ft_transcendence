import { IsString, IsBoolean, IsOptional, IsNumber, IsDateString, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @ApiProperty({ minLength: 5, maxLength: 100 })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  goalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  goalVisible?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
