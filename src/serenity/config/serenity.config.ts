import { registerAs } from '@nestjs/config';
import { IsIn, IsNumberString, IsOptional } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { SerenityConfig } from './serenity-config.type';

class EnvironmentVariablesValidator {
  @IsNumberString()
  @IsOptional()
  LOYALTY_POINT_VALUE_INR: string;

  @IsNumberString()
  @IsOptional()
  LOYALTY_MAX_REDEEM_PERCENT: string;

  @IsNumberString()
  @IsOptional()
  LOYALTY_EARN_RATE: string;

  @IsNumberString()
  @IsOptional()
  PRICING_GST_RATE: string;

  @IsOptional()
  @IsIn(['auto', 'seed', 'petpooja'])
  MENU_SOURCE: string;
}

function numberOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) ? parsed : fallback;
}

export default registerAs<SerenityConfig>('serenity', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const menuSourceRaw = (process.env.MENU_SOURCE || 'auto').toLowerCase();
  const menuSource =
    menuSourceRaw === 'seed' || menuSourceRaw === 'petpooja'
      ? menuSourceRaw
      : 'auto';

  return {
    loyaltyPointValueInr: numberOrDefault(
      process.env.LOYALTY_POINT_VALUE_INR,
      1,
    ),
    loyaltyMaxRedeemPercent: numberOrDefault(
      process.env.LOYALTY_MAX_REDEEM_PERCENT,
      0.2,
    ),
    loyaltyEarnRate: numberOrDefault(process.env.LOYALTY_EARN_RATE, 0.2),
    gstRate: numberOrDefault(process.env.PRICING_GST_RATE, 0.025),
    menuSource,
  };
});
