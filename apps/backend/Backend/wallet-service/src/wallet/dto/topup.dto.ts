import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DepositDto } from './deposit.dto.js';

export class TopupDto extends DepositDto {
  @ApiPropertyOptional({ description: 'Provider de pagamento (ex: stripe, mock)' })
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
