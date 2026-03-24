import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFAValidateDto {
  @ApiProperty({
    description: 'Temporary JWT token received during login with 2FA',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  @IsString()
  tempToken!: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  code!: string;
}
