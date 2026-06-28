import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PetpoojaService } from '../services/petpooja.service';
import { PetpoojaAuthGuard } from '../guards/petpooja-auth.guard';
import { SaveOrderDto } from '../dto/save-order.dto';
import { FetchMenuDto } from '../dto/fetch-menu.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { UpdateRiderStatusDto } from '../dto/rider-status.dto';

@ApiTags('Petpooja Outbound APIs')
@ApiHeader({ name: 'app-key', required: true })
@ApiHeader({ name: 'app-secret', required: true })
@ApiHeader({ name: 'access-token', required: true })
@Controller({
  path: 'petpooja/outbound',
  version: '1',
})
@UseGuards(PetpoojaAuthGuard)
export class PetpoojaOutboundController {
  constructor(private readonly petpoojaService: PetpoojaService) {}

  @Post('orders/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push new order to PetPooja PoS' })
  saveOrder(@Body() dto: SaveOrderDto) {
    return this.petpoojaService.saveOrder(dto);
  }

  @Post('menu/fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch current menu from PetPooja' })
  fetchMenu(@Body() dto: FetchMenuDto) {
    return this.petpoojaService.fetchMenu(dto);
  }

  @Post('orders/update-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order on PetPooja' })
  updateOrderStatus(@Body() dto: UpdateOrderStatusDto) {
    return this.petpoojaService.updateOrderStatus(dto);
  }

  @Post('delivery/rider-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update rider status on PetPooja' })
  updateRiderStatus(@Body() dto: UpdateRiderStatusDto) {
    return this.petpoojaService.updateRiderStatus(dto);
  }
}
