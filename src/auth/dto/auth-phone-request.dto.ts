import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AuthPhoneRequestDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MinLength(10)
  phone: string;
}
