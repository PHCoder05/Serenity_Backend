import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
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

export class DiyQuoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  base?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  protein?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fibre?: string;
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

  @ApiPropertyOptional({ enum: ['dine-in', 'deliver', 'takeaway'] })
  @IsOptional()
  @IsIn(['dine-in', 'deliver', 'takeaway'])
  fulfillmentType?: 'dine-in' | 'deliver' | 'takeaway';
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  tableNumber?: number;

  @ApiProperty({ enum: ['UPI', 'CARD'] })
  @IsIn(['UPI', 'CARD'])
  paymentMethod: 'UPI' | 'CARD';

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
    description: 'Ignored — SOW requires a signed-in account for every order',
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
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ example: '1998-04-26' })
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must be YYYY-MM-DD',
  })
  dateOfBirth?: string | null;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  menuItemId?: string;

  @ApiPropertyOptional({ type: DiySelectionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiySelectionsDto)
  diySelections?: DiySelectionsDto;
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

export class SetSavedEventDto {
  @ApiProperty()
  @IsBoolean()
  saved: boolean;
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
      'Ignored when items or eventId are sent. Server prices the cart or the event deposit.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Event whose deposit this intent pays. Server reads the deposit.',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ enum: ['UPI', 'CARD'] })
  @IsIn(['UPI', 'CARD'])
  method: 'UPI' | 'CARD';

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

  @ApiPropertyOptional({ enum: ['dine-in', 'deliver', 'takeaway'] })
  @IsOptional()
  @IsIn(['dine-in', 'deliver', 'takeaway'])
  fulfillmentType?: 'dine-in' | 'deliver' | 'takeaway';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;
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
  @ApiProperty({ enum: ['razorpay', 'stripe', 'payu', 'mock'] })
  @IsIn(['razorpay', 'stripe', 'payu', 'mock'])
  provider: 'razorpay' | 'stripe' | 'payu' | 'mock';

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
  @ApiProperty({ enum: ['razorpay', 'stripe', 'payu', 'mock'] })
  @IsIn(['razorpay', 'stripe', 'payu', 'mock'])
  provider: 'razorpay' | 'stripe' | 'payu' | 'mock';
}

export class TestPaymentGatewayDto {
  @ApiProperty({ enum: ['razorpay', 'stripe', 'payu', 'mock'] })
  @IsIn(['razorpay', 'stripe', 'payu', 'mock'])
  provider: 'razorpay' | 'stripe' | 'payu' | 'mock';

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

  @ApiPropertyOptional({
    type: [String],
    description: 'Restrict to these menu item ids',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[] | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Restrict to these menu categories',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[] | null;
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

  @ApiPropertyOptional({
    description:
      'Earn lots older than this many days stop counting. Null = never expire.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsInt()
  @Min(1)
  expiryDays?: number | null;
}

export class BroadcastNotificationDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ example: 'broadcast' })
  @IsOptional()
  @IsString()
  type?: string;
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ enum: ['ios', 'android', 'web'] })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: 'ios' | 'android' | 'web';
}

export class UnregisterDeviceTokenDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class HomeBannerDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  href?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpsertHomeSettingsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredMenuItemIds?: string[];

  @ApiPropertyOptional({ type: [HomeBannerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeBannerDto)
  banners?: HomeBannerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeeInr?: number;
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

export class RejectEventDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
