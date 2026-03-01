import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Valid email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Alphanumeric username (3-30 chars, underscores allowed)',
    example: 'john_doe',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, {
    message: 'Username must be 3-30 alphanumeric characters or underscores',
  })
  username!: string;

  @ApiProperty({
    description: 'Strong password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)',
    example: 'Str0ngP@ss',
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit',
  })
  password!: string;
}