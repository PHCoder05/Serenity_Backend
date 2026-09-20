import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveOrderDto {
  @ApiProperty()
  @IsString()
  restID: string;

  @ApiProperty()
  @IsObject()
  orderinfo: object;
}
