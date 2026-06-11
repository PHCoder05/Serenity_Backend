import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PetpoojaService } from '../services/petpooja.service';
import { SaveOrderDto } from '../dto/save-order.dto';
import { FetchMenuDto } from '../dto/fetch-menu.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { UpdateRiderStatusDto } from '../dto/rider-status.dto';

@ApiTags('Petpooja Outbound APIs')
@Controller('api/v1/petpooja/outbound')
export class PetpoojaOutboundController {
  constructor(private readonly petpoojaService: PetpoojaService) {}

  @Post('orders/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push new order to PetPooja PoS' })
  async saveOrder(@Body() dto: SaveOrderDto) {
    return this.petpoojaService.saveOrder(dto);
  }

  @Post('menu/fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch current menu from PetPooja' })
  async fetchMenu(@Body() dto: FetchMenuDto) {
    return this.petpoojaService.fetchMenu(dto);
  }

  @Post('orders/update-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order on PetPooja' })
  async updateOrderStatus(@Body() dto: UpdateOrderStatusDto) {
    return this.petpoojaService.updateOrderStatus(dto);
  }

  @Post('delivery/rider-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update rider status on PetPooja' })
  async updateRiderStatus(@Body() dto: UpdateRiderStatusDto) {
    return this.petpoojaService.updateRiderStatus(dto);
  }
}
