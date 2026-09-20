import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderCallbackDto {
  @ApiProperty()
  @IsString()
  restID: string;

  @ApiProperty()
  @IsString()
  orderID: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cancel_reason?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  minimum_prep_time?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  minimum_delivery_time?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rider_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rider_phone_number?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  is_modified?: string;
}
