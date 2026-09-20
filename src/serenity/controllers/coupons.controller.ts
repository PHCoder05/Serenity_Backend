import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CouponService } from '../services/coupon.service';

@ApiTags('Coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @ApiOkResponse()
  listAvailable() {
    return this.couponService.listAvailable();
  }
}
