import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FetchMenuDto {
  @ApiProperty()
  @IsString()
  restID: string;
}
