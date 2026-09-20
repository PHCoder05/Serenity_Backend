import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * PetPooja push-menu payloads are large and vary by account. Keep top-level
 * shape validated, but preserve nested restaurant/category/item trees as
 * opaque objects so ValidationPipe whitelist does not strip menu content.
 */
export class PushMenuDto {
  @ApiProperty()
  @IsString()
  success: string;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  @IsObject({ each: true })
  restaurants: Record<string, unknown>[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  items?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  categories?: Record<string, unknown>[];
}
