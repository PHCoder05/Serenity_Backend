import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiySelectionsDto {
  @ApiProperty()
  @IsString()
  base: string;

  @ApiProperty()
  @IsString()
  protein: string;

  @ApiProperty()
  @IsString()
  fibre: string;
}

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

  @ApiPropertyOptional({ type: DiySelectionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiySelectionsDto)
  diySelections?: DiySelectionsDto;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  redeemPoints?: number;

  @ApiPropertyOptional({
    description: 'Outlet id or slug; defaults to the configured default outlet',
  })
  @IsOptional()
  @IsString()
  outletId?: string;
}

export class GuestContactDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateOrderDto extends OrderQuoteDto {
  @ApiProperty()
  @IsString()
  deliveryAddress: string;

  @ApiProperty({ enum: ['UPI', 'CARD', 'COD'] })
  @IsIn(['UPI', 'CARD', 'COD'])
  paymentMethod: 'UPI' | 'CARD' | 'COD';

  @ApiPropertyOptional({
    description: 'Required for UPI/CARD — succeeded payment intent id',
  })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    type: GuestContactDto,
    description: 'Required when placing order without JWT (guest COD)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestContactDto)
  guest?: GuestContactDto;
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

  @ApiPropertyOptional({
    description: 'Flat deposit INR per booking; 0 = free',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmountInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;
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

  @ApiPropertyOptional({
    description: 'Required when event.depositAmountInr > 0',
  })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;
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

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePaymentIntentDto {
  @ApiPropertyOptional({
    description:
      'Optional for online when `items` provided (server prices). Required for COD.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({ enum: ['UPI', 'CARD', 'COD'] })
  @IsIn(['UPI', 'CARD', 'COD'])
  method: 'UPI' | 'CARD' | 'COD';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    type: [OrderQuoteItemDto],
    description: 'Required for UPI/CARD — server computes amount from cart',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderQuoteItemDto)
  items?: OrderQuoteItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  redeemPoints?: number;
}

export class ConfirmPaymentIntentDto {
  @ApiPropertyOptional({
    description: 'Optional client reference from a PSP checkout session',
  })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({
    description:
      'Provider-specific checkout result (e.g. razorpay_payment_id + razorpay_signature)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  clientResult?: Record<string, string>;
}

export class UpsertPaymentGatewayDto {
  @ApiProperty({ enum: ['razorpay', 'stripe', 'payu'] })
  @IsIn(['razorpay', 'stripe', 'payu'])
  provider: 'razorpay' | 'stripe' | 'payu';

  @ApiProperty({ enum: ['test', 'live'] })
  @IsIn(['test', 'live'])
  mode: 'test' | 'live';

  @ApiProperty({
    description: 'Provider credentials object (full secrets on write only)',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  credentials: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

export class ActivatePaymentGatewayDto {
  @ApiProperty({ enum: ['razorpay', 'stripe', 'payu'] })
  @IsIn(['razorpay', 'stripe', 'payu'])
  provider: 'razorpay' | 'stripe' | 'payu';
}

export class TestPaymentGatewayDto {
  @ApiProperty({ enum: ['razorpay', 'stripe', 'payu'] })
  @IsIn(['razorpay', 'stripe', 'payu'])
  provider: 'razorpay' | 'stripe' | 'payu';

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @ApiPropertyOptional({ enum: ['test', 'live'] })
  @IsOptional()
  @IsIn(['test', 'live'])
  mode?: 'test' | 'live';
}

export class UpsertOutletDto {
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  petpoojaRestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpsertCouponDto {
  @ApiProperty({ enum: ['flat', 'percent'] })
  @IsIn(['flat', 'percent'])
  type: 'flat' | 'percent';

  @ApiProperty({ description: 'INR for flat; 1–100 for percent' })
  @IsInt()
  @Min(1)
  value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minSubtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLoyaltyRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  pointValueInr?: number;

  @ApiPropertyOptional({ description: '0–1 fraction of total redeemable' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxRedeemPercent?: number;

  @ApiPropertyOptional({ description: 'Points earned per INR of net total' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  earnRate?: number;
}

export class UpsertHomeMoodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEventAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmountInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationOpenAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationCloseAt?: string | null;
}
