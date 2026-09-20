import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemStockDto {
  @ApiProperty()
  @IsString()
  restID: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsBoolean()
  inStock: boolean;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  itemID: string[];
}

export class ItemStockOffDto {
  @ApiProperty()
  @IsString()
  restID: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsBoolean()
  inStock: boolean;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  itemID: string[];

  @ApiProperty()
  @IsString()
  autoTurnOnTime: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customTurnOnTime?: string;
}
