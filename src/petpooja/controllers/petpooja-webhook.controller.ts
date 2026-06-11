import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PetpoojaAuthGuard } from '../guards/petpooja-auth.guard';
import { PushMenuDto } from '../dto/push-menu.dto';
import { OrderCallbackDto } from '../dto/order-callback.dto';
import { ItemStockDto, ItemStockOffDto } from '../dto/item-stock.dto';
import { GetStoreStatusDto, UpdateStoreStatusDto } from '../dto/store-status.dto';

@ApiTags('Petpooja Webhooks')
@Controller('api/v1/petpooja/webhook')
@UseGuards(PetpoojaAuthGuard)
export class PetpoojaWebhookController {
  
  @Post('push-menu')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive menu updates from PetPooja' })
  async pushMenu(@Body() dto: PushMenuDto) {
    // Process menu update
    return {
      success: '1',
      message: 'Menu items are successfully listed.',
    };
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive order status updates' })
  async orderCallback(@Body() dto: OrderCallbackDto) {
    // Process order status update
    return {
      success: '1',
      message: 'Order callback received successfully.',
    };
  }

  @Post('item-stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle item/addon in-stock' })
  async itemStock(@Body() dto: ItemStockDto) {
    // Update item stock
    return {
      code: 200,
      status: 'success',
      message: 'Stock status updated successfully',
    };
  }

  @Post('item-stock-off')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark items out-of-stock' })
  async itemStockOff(@Body() dto: ItemStockOffDto) {
    // Update item stock off
    return {
      code: 200,
      status: 'success',
      message: 'Stock status updated successfully',
    };
  }

  @Post('get-store-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return current store status' })
  async getStoreStatus(@Body() dto: GetStoreStatusDto) {
    // Return actual store status
    return {
      http_code: 200,
      status: 'success',
      store_status: '1', // 1=Open, 0=Closed
      message: 'Store Delivery Status fetched successfully',
    };
  }

  @Post('update-store-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle store open/close' })
  async updateStoreStatus(@Body() dto: UpdateStoreStatusDto) {
    // Update store status
    return {
      http_code: 200,
      status: 'success',
      message: 'Store Status updated successfully',
    };
  }
}
