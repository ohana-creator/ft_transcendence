import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty() @IsString() toAddress: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.000001) amount: number;
}