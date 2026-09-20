import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PetpoojaAuthGuard } from '../guards/petpooja-auth.guard';
import { PushMenuDto } from '../dto/push-menu.dto';
import { OrderCallbackDto } from '../dto/order-callback.dto';
import { ItemStockDto, ItemStockOffDto } from '../dto/item-stock.dto';
import {
  GetStoreStatusDto,
  UpdateStoreStatusDto,
} from '../dto/store-status.dto';
import { PetpoojaWebhookService } from '../services/petpooja-webhook.service';

@ApiTags('Petpooja Webhooks')
@Controller({
  path: 'petpooja/webhook',
  version: '1',
})
export class PetpoojaWebhookController {
  constructor(private readonly webhookService: PetpoojaWebhookService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook base URL health check (PetPooja connectivity probe)',
  })
  healthCheck() {
    return {
      status: 'ok',
      service: 'serenity-petpooja-webhook',
    };
  }

  /**
   * Path aliases match PetPooja API docs / sandbox Configuration suffixes
   * (pushmenu, item_stock, …) while keeping our hyphen routes for existing docs.
   */
  @Post(['push-menu', 'pushmenu', 'pushmenu_endpoint'])
  @UseGuards(PetpoojaAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive menu updates from PetPooja' })
  pushMenu(@Body() dto: PushMenuDto) {
    return this.webhookService.pushMenu(dto);
  }

  @Post('callback')
  @UseGuards(PetpoojaAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive order status updates' })
  orderCallback(@Body() dto: OrderCallbackDto) {
    return this.webhookService.orderCallback(dto);
  }

  @Post(['item-stock', 'item_stock'])
  @UseGuards(PetpoojaAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle item/addon in-stock' })
  itemStock(@Body() dto: ItemStockDto) {
    return this.webhookService.itemStock(dto);
  }

  @Post(['item-stock-off', 'item_stock_off'])
  @UseGuards(PetpoojaAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark items out-of-stock' })
  itemStockOff(@Body() dto: ItemStockOffDto) {
    return this.webhookService.itemStockOff(dto);
  }

  @Post(['get-store-status', 'get_store_status'])
  @UseGuards(PetpoojaAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return current store status' })
  getStoreStatus(@Body() dto: GetStoreStatusDto) {
    return this.webhookService.getStoreStatus(dto);
  }

  @Post(['update-store-status', 'update_store_status'])
  @UseGuards(PetpoojaAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle store open/close' })
  updateStoreStatus(@Body() dto: UpdateStoreStatusDto) {
    return this.webhookService.updateStoreStatus(dto);
  }
}
