import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RestaurantDetailsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  restaurantname?: string;
  // Other properties can be added here based on full spec
}

class RestaurantDto {
  @ApiProperty()
  @IsString()
  restaurantid: string;

  @ApiProperty()
  @IsString()
  active: string;

  @ApiPropertyOptional({ type: RestaurantDetailsDto })
  @ValidateNested()
  @Type(() => RestaurantDetailsDto)
  @IsOptional()
  details?: RestaurantDetailsDto;
}

export class PushMenuDto {
  @ApiProperty()
  @IsString()
  success: string;

  @ApiProperty({ type: [RestaurantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantDto)
  restaurants: RestaurantDto[];
}
