import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';

export class AuthRegisterDto {
  @ApiProperty({ example: 'Ada' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'ada@serenity.cafe' })
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MinLength(10)
  phone: string;

  @ApiProperty({ example: '123456', description: 'OTP from POST /auth/phone/request' })
  @IsString()
  @Length(4, 8)
  otpCode: string;

  @ApiPropertyOptional({ description: 'Optional password for later email login' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
