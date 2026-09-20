import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetStoreStatusDto {
  @ApiProperty()
  @IsString()
  restID: string;
}

export class UpdateStoreStatusDto {
  @ApiProperty()
  @IsString()
  restID: string;

  @ApiProperty()
  @IsNumber()
  store_status: number;

  @ApiProperty()
  @IsString()
  turn_on_time: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}
