import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty()
  @IsString()
  restID: string;

  @ApiProperty()
  @IsString()
  orderID: string;

  @ApiProperty()
  @IsString()
  clientorderID: string;

  @ApiProperty()
  @IsString()
  cancelReason: string;

  @ApiProperty()
  @IsString()
  status: string;
}
