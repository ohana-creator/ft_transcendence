import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TopupDto {
  @ApiPropertyOptional({ description: 'Montante a carregar (sem bloqueio HTTP; regra de limite tratada no service)', example: 100.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Nota opcional' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Provider de pagamento (ex: stripe, mock)' })
  @Transform(({ value, obj }) => value ?? obj?.paymentMethod)
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Modo do topup: instant credita na hora; checkout retorna URL para confirmação externa',
    enum: ['instant', 'checkout'],
    default: 'checkout',
  })
  @IsOptional()
  @IsIn(['instant', 'checkout'])
  mode?: 'instant' | 'checkout';
}
