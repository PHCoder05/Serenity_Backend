import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AuthPhoneFirebaseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Firebase Auth ID token from phone OTP',
  })
  @IsString()
  @MinLength(20)
  idToken: string;
}
