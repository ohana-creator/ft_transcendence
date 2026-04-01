import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ description: 'Montante a depositar (max 2 casas decimais, max 1.000.000)', example: 100.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: 'Nota opcional' })
  @IsOptional()
  @IsString()
  note?: string;
}
