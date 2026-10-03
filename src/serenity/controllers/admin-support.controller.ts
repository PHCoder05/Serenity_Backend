import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { SupportService } from '../services/support.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Support')
@Controller({ path: 'admin/support', version: '1' })
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('customers')
  @ApiOkResponse()
  searchCustomers(@Query('q') q?: string) {
    return this.supportService.searchCustomers(q);
  }

  @Get('orders')
  @ApiOkResponse()
  searchOrders(@Query('q') q?: string) {
    return this.supportService.searchOrders(q);
  }

  @Post('orders/:id/collect')
  @ApiOkResponse()
  collectPayment(@Param('id') id: string) {
    return this.supportService.collectPayment(id);
  }

  @Post('orders/:id/serve')
  @ApiOkResponse()
  markServed(@Param('id') id: string) {
    return this.supportService.markServed(id);
  }
}
