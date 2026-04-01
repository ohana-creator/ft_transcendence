import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para solicitar envio de código 2FA por email
 */
export class Request2FAEmailDto {
  @ApiProperty({
    description: 'Email to send 2FA code to',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Login identifier (email or username)',
    example: 'john_doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  identifier?: string;
}

/**
 * DTO para validar código 2FA por email durante login
 */
export class Validate2FAEmailDto {
  @ApiProperty({
    description: 'Temporary JWT token from login response',
    example: 'eyJhbGc...',
  })
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @ApiProperty({
    description: '6-digit code received via email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: '2FA code must be exactly 6 digits',
  })
  code!: string;
}

/**
 * DTO para ativar 2FA por email (dentro da conta, settings)
 */
export class Enable2FAEmailDto {
  @ApiProperty({
    description: '6-digit code received via email during setup',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: '2FA code must be exactly 6 digits',
  })
  code!: string;
}
