import {
  IsString,
  IsNumber,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class RiderDataDto {
  @ApiProperty()
  @IsString()
  rider_name: string;

  @ApiProperty()
  @IsString()
  rider_phone_number: string;
}

export class UpdateRiderStatusDto {
  @ApiProperty()
  @IsNumber()
  order_id: number;

  @ApiProperty()
  @IsString()
  outlet_id: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty({ type: RiderDataDto })
  @ValidateNested()
  @Type(() => RiderDataDto)
  rider_data: RiderDataDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  external_order_id?: string;
}
