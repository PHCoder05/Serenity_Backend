import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderQuoteItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detail?: string;
}

export class OrderQuoteDto {
  @ApiProperty({ type: [OrderQuoteItemDto] })
  @ValidateNested({ each: true })
  @Type(() => OrderQuoteItemDto)
  items: OrderQuoteItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CreateOrderDto extends OrderQuoteDto {
  @ApiProperty()
  @IsString()
  deliveryAddress: string;

  @ApiProperty({ enum: ['UPI', 'CARD', 'COD'] })
  @IsIn(['UPI', 'CARD', 'COD'])
  paymentMethod: 'UPI' | 'CARD' | 'COD';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultAddress?: string;
}

export class UpdateDietPreferencesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  selectedIds: string[];
}

export class UpsertSavedBowlDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  addons: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  savedNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;
}

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  subtitle: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  dateLabel: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsString()
  audience: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuHighlights?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;
}

export class CreateEventBookingDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  guestCount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SubmitOrderFeedbackDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  foodRating: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  serviceRating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: ['UPI', 'CARD', 'COD'] })
  @IsIn(['UPI', 'CARD', 'COD'])
  method: 'UPI' | 'CARD' | 'COD';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class PaymentWebhookDto {
  @ApiProperty()
  @IsString()
  paymentIntentId: string;

  @ApiProperty({ enum: ['succeeded', 'failed'] })
  @IsIn(['succeeded', 'failed'])
  status: 'succeeded' | 'failed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureReason?: string;
}
