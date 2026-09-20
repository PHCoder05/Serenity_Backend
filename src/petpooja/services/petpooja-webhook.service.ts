import { Injectable, Logger, Optional } from '@nestjs/common';
import { PushMenuDto } from '../dto/push-menu.dto';
import { OrderCallbackDto } from '../dto/order-callback.dto';
import { ItemStockDto, ItemStockOffDto } from '../dto/item-stock.dto';
import {
  GetStoreStatusDto,
  UpdateStoreStatusDto,
} from '../dto/store-status.dto';
import { SaveOrderDto } from '../dto/save-order.dto';
import { PetpoojaRepository } from '../infrastructure/persistence/petpooja.repository';
import { PetpoojaMenuSyncService } from './petpooja-menu-sync.service';
import { PetpoojaSerenityOrderService } from './petpooja-serenity-order.service';

@Injectable()
export class PetpoojaWebhookService {
  private readonly logger = new Logger(PetpoojaWebhookService.name);

  constructor(
    private readonly petpoojaRepository: PetpoojaRepository,
    @Optional()
    private readonly menuSyncService?: PetpoojaMenuSyncService,
    @Optional()
    private readonly serenityOrderService?: PetpoojaSerenityOrderService,
  ) {}

  async pushMenu(dto: PushMenuDto) {
    for (const restaurant of dto.restaurants) {
      const restId = String(restaurant.restaurantid ?? '');
      if (!restId) {
        continue;
      }

      const details =
        restaurant.details && typeof restaurant.details === 'object'
          ? (restaurant.details as Record<string, unknown>)
          : undefined;

      await this.petpoojaRepository.upsertRestaurant({
        restId,
        name:
          typeof details?.restaurantname === 'string'
            ? details.restaurantname
            : null,
        active: String(restaurant.active ?? '1'),
        storeStatus: '1',
      });

      await this.petpoojaRepository.saveMenuSnapshot(
        restId,
        dto as unknown as Record<string, unknown>,
        'push',
      );
    }

    await this.menuSyncService?.syncFromPayload(
      dto as unknown as Record<string, unknown>,
    );

    return {
      success: '1',
      message: 'Menu items are successfully listed.',
    };
  }

  async orderCallback(dto: OrderCallbackDto) {
    await this.petpoojaRepository.upsertOrder({
      restId: dto.restID,
      orderId: dto.orderID,
      clientOrderId: dto.orderID,
      status: dto.status,
      cancelReason: dto.cancel_reason ?? null,
      minimumPrepTime: dto.minimum_prep_time ?? null,
      riderName: dto.rider_name ?? null,
      riderPhone: dto.rider_phone_number ?? null,
      isModified: dto.is_modified ?? null,
    });

    await this.serenityOrderService?.applyOrderCallback(dto);

    return {
      success: '1',
      message: 'Order callback received successfully.',
    };
  }

  async itemStock(dto: ItemStockDto) {
    await this.petpoojaRepository.upsertItemStock(
      dto.itemID.map((itemId) => ({
        restId: dto.restID,
        itemId,
        type: dto.type,
        inStock: dto.inStock,
      })),
    );

    const affected =
      (await this.menuSyncService?.updateStockByPetpoojaIds(
        dto.itemID,
        true,
      )) ?? 0;
    if (affected === 0) {
      this.logger.warn(
        `item_stock matched 0 menu rows for petpooja ids=${dto.itemID.join(',')}`,
      );
    }

    return {
      code: 200,
      status: 'success',
      message: 'Stock status updated successfully',
    };
  }

  async itemStockOff(dto: ItemStockOffDto) {
    await this.petpoojaRepository.upsertItemStock(
      dto.itemID.map((itemId) => ({
        restId: dto.restID,
        itemId,
        type: dto.type,
        inStock: dto.inStock,
        autoTurnOnTime: dto.autoTurnOnTime,
        customTurnOnTime: dto.customTurnOnTime ?? null,
      })),
    );

    const affected =
      (await this.menuSyncService?.updateStockByPetpoojaIds(
        dto.itemID,
        false,
      )) ?? 0;
    if (affected === 0) {
      this.logger.warn(
        `item_stock_off matched 0 menu rows for petpooja ids=${dto.itemID.join(',')}`,
      );
    }

    return {
      code: 200,
      status: 'success',
      message: 'Stock status updated successfully',
    };
  }

  async getStoreStatus(dto: GetStoreStatusDto) {
    const restaurant = await this.petpoojaRepository.getRestaurant(dto.restID);

    return {
      http_code: 200,
      status: 'success',
      store_status: restaurant?.storeStatus ?? '1',
      message: 'Store Delivery Status fetched successfully',
    };
  }

  async updateStoreStatus(dto: UpdateStoreStatusDto) {
    await this.petpoojaRepository.upsertRestaurant({
      restId: dto.restID,
      storeStatus: String(dto.store_status),
      turnOnTime: dto.turn_on_time,
      closedReason: dto.reason ?? null,
    });

    await this.serenityOrderService?.applyStoreStatus(dto);

    return {
      http_code: 200,
      status: 'success',
      message: `Store Status updated successfully for store ${dto.restID}`,
    };
  }

  async persistOutboundOrder(dto: SaveOrderDto, status = 'pending') {
    const orderDetails = this.extractOrderDetails(dto.orderinfo);

    await this.petpoojaRepository.upsertOrder({
      restId: dto.restID,
      orderId: orderDetails.orderId,
      clientOrderId: orderDetails.clientOrderId,
      status,
      orderInfo: dto.orderinfo as Record<string, unknown>,
    });
  }

  async persistFetchedMenu(restId: string, payload: Record<string, unknown>) {
    await this.petpoojaRepository.saveMenuSnapshot(restId, payload, 'fetch');
    await this.menuSyncService?.syncFromPayload(payload);
  }

  private extractOrderDetails(orderinfo: object): {
    orderId: string;
    clientOrderId: string | null;
  } {
    const info = orderinfo as {
      Order?: {
        details?: {
          orderID?: string;
          clientOrderID?: string;
        };
      };
      OrderInfo?: {
        Order?: {
          details?: {
            orderID?: string;
            clientOrderID?: string;
          };
        };
      };
    };

    const details =
      info.OrderInfo?.Order?.details ?? info.Order?.details ?? undefined;
    const orderId = details?.orderID ?? details?.clientOrderID ?? 'unknown';

    return {
      orderId,
      clientOrderId: details?.orderID ?? details?.clientOrderID ?? null,
    };
  }
}
