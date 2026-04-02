import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_DEPOSIT_AMOUNT = 1_000_000;

export class DepositDto {
  @ApiProperty({ description: 'Montante a depositar (max 2 casas decimais, max 1.000.000)', example: 100.50 })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.trim().replace(',', '.');
      return normalized === '' ? value : Number(normalized);
    }

    return value;
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_DEPOSIT_AMOUNT, { message: 'Valor maximo permitido: 1000000' })
  amount!: number;

  @ApiPropertyOptional({ description: 'Nota opcional' })
  @IsOptional()
  @IsString()
  note?: string;
}
