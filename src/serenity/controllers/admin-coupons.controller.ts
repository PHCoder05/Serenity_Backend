import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { UpsertCouponDto } from '../dto/serenity.dto';
import { CouponService } from '../services/coupon.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Coupons')
@Controller({ path: 'admin/coupons', version: '1' })
export class AdminCouponsController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @ApiOkResponse()
  list() {
    return this.couponService.list();
  }

  @Get(':code')
  @ApiOkResponse()
  get(@Param('code') code: string) {
    return this.couponService.get(code);
  }

  @Put(':code')
  @ApiOkResponse()
  upsert(@Param('code') code: string, @Body() dto: UpsertCouponDto) {
    return this.couponService.upsert(code, dto);
  }
}
