import { registerAs } from '@nestjs/config';
import { PetpoojaConfig } from './petpooja-config.type';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  PETPOOJA_APP_KEY: string;

  @IsString()
  @IsOptional()
  PETPOOJA_APP_SECRET: string;

  @IsString()
  @IsOptional()
  PETPOOJA_ACCESS_TOKEN: string;

  @IsString()
  @IsOptional()
  PETPOOJA_RESTAURANT_ID: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  PETPOOJA_SAVE_ORDER_URL: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  PETPOOJA_FETCH_MENU_URL: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  PETPOOJA_UPDATE_ORDER_STATUS_URL: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  PETPOOJA_RIDER_STATUS_URL: string;

  @IsString()
  @IsOptional()
  PETPOOJA_ORDER_SYNC_ENABLED: string;

  @IsString()
  @IsOptional()
  PETPOOJA_MENU_SYNC_ENABLED: string;
}

export default registerAs<PetpoojaConfig>('petpooja', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    appKey: process.env.PETPOOJA_APP_KEY || '',
    appSecret: process.env.PETPOOJA_APP_SECRET || '',
    accessToken: process.env.PETPOOJA_ACCESS_TOKEN || '',
    restaurantId: process.env.PETPOOJA_RESTAURANT_ID || '',
    saveOrderUrl:
      process.env.PETPOOJA_SAVE_ORDER_URL ||
      'https://47pfzh5sf2.execute-api.ap-southeast-1.amazonaws.com/V1/save_order',
    fetchMenuUrl:
      process.env.PETPOOJA_FETCH_MENU_URL ||
      'https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/mapped_restaurant_menus',
    updateOrderStatusUrl:
      process.env.PETPOOJA_UPDATE_ORDER_STATUS_URL ||
      'https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/update_order_status',
    riderStatusUrl:
      process.env.PETPOOJA_RIDER_STATUS_URL ||
      'https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/rider_status_update',
    orderSyncEnabled: process.env.PETPOOJA_ORDER_SYNC_ENABLED !== 'false',
    menuSyncEnabled: process.env.PETPOOJA_MENU_SYNC_ENABLED !== 'false',
  };
});
