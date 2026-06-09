import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Legacy alias for identifier (email only)',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Email or username (supports legacy `email` field as alias)',
    example: 'user@example.com',
  })
  @Transform(({ value, obj }) => value ?? obj?.email)
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({
    description: 'Account password',
    example: 'Str0ngP@ss',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}