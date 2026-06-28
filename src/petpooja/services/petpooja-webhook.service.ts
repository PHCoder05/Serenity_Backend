import { Injectable, Optional } from '@nestjs/common';
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
  constructor(
    private readonly petpoojaRepository: PetpoojaRepository,
    @Optional()
    private readonly menuSyncService?: PetpoojaMenuSyncService,
    @Optional()
    private readonly serenityOrderService?: PetpoojaSerenityOrderService,
  ) {}

  async pushMenu(dto: PushMenuDto) {
    for (const restaurant of dto.restaurants) {
      await this.petpoojaRepository.upsertRestaurant({
        restId: restaurant.restaurantid,
        name: restaurant.details?.restaurantname ?? null,
        active: restaurant.active,
        storeStatus: '1',
      });

      await this.petpoojaRepository.saveMenuSnapshot(
        restaurant.restaurantid,
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

    await this.menuSyncService?.updateStockByPetpoojaIds(dto.itemID, true);

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

    await this.menuSyncService?.updateStockByPetpoojaIds(dto.itemID, false);

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
    };

    const details = info.Order?.details;
    const orderId = details?.orderID ?? details?.clientOrderID ?? 'unknown';

    return {
      orderId,
      clientOrderId: details?.clientOrderID ?? null,
    };
  }
}
