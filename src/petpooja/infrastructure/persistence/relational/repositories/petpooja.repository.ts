import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  PetpoojaItemStockRecord,
  PetpoojaOrderRecord,
  PetpoojaRepository,
  PetpoojaRestaurantRecord,
} from '../../petpooja.repository';
import { PetpoojaMenuItemStockEntity } from '../entities/petpooja-menu-item-stock.entity';
import { PetpoojaMenuSnapshotEntity } from '../entities/petpooja-menu-snapshot.entity';
import { PetpoojaOrderEntity } from '../entities/petpooja-order.entity';
import { PetpoojaRestaurantEntity } from '../entities/petpooja-restaurant.entity';

@Injectable()
export class PetpoojaRelationalRepository implements PetpoojaRepository {
  constructor(
    @InjectRepository(PetpoojaRestaurantEntity)
    private readonly restaurantRepository: Repository<PetpoojaRestaurantEntity>,
    @InjectRepository(PetpoojaMenuSnapshotEntity)
    private readonly menuSnapshotRepository: Repository<PetpoojaMenuSnapshotEntity>,
    @InjectRepository(PetpoojaMenuItemStockEntity)
    private readonly itemStockRepository: Repository<PetpoojaMenuItemStockEntity>,
    @InjectRepository(PetpoojaOrderEntity)
    private readonly orderRepository: Repository<PetpoojaOrderEntity>,
  ) {}

  async upsertRestaurant(
    data: PetpoojaRestaurantRecord,
  ): Promise<PetpoojaRestaurantRecord> {
    let entity = await this.restaurantRepository.findOne({
      where: { restId: data.restId },
    });

    if (!entity) {
      entity = this.restaurantRepository.create({
        restId: data.restId,
      });
    }

    entity.name = data.name ?? entity.name;
    entity.active = data.active ?? entity.active;
    entity.storeStatus = data.storeStatus ?? entity.storeStatus;
    entity.turnOnTime = data.turnOnTime ?? entity.turnOnTime;
    entity.closedReason = data.closedReason ?? entity.closedReason;

    const saved = await this.restaurantRepository.save(entity);
    return this.toRestaurantRecord(saved);
  }

  async getRestaurant(
    restId: string,
  ): Promise<NullableType<PetpoojaRestaurantRecord>> {
    const entity = await this.restaurantRepository.findOne({
      where: { restId },
    });

    return entity ? this.toRestaurantRecord(entity) : null;
  }

  async saveMenuSnapshot(
    restId: string,
    payload: Record<string, unknown>,
    source: 'push' | 'fetch',
  ): Promise<void> {
    await this.menuSnapshotRepository.save(
      this.menuSnapshotRepository.create({
        restId,
        payload,
        source,
      }),
    );
  }

  async upsertItemStock(records: PetpoojaItemStockRecord[]): Promise<void> {
    for (const record of records) {
      let entity = await this.itemStockRepository.findOne({
        where: {
          restId: record.restId,
          itemId: record.itemId,
          type: record.type,
        },
      });

      if (!entity) {
        entity = this.itemStockRepository.create({
          restId: record.restId,
          itemId: record.itemId,
          type: record.type,
        });
      }

      entity.inStock = record.inStock;
      entity.autoTurnOnTime = record.autoTurnOnTime ?? null;
      entity.customTurnOnTime = record.customTurnOnTime ?? null;

      await this.itemStockRepository.save(entity);
    }
  }

  async upsertOrder(data: PetpoojaOrderRecord): Promise<PetpoojaOrderRecord> {
    let entity = await this.orderRepository.findOne({
      where: {
        restId: data.restId,
        orderId: data.orderId,
      },
    });

    if (!entity) {
      entity = this.orderRepository.create({
        restId: data.restId,
        orderId: data.orderId,
      });
    }

    entity.clientOrderId = data.clientOrderId ?? entity.clientOrderId;
    entity.status = data.status;
    entity.orderInfo = data.orderInfo ?? entity.orderInfo;
    entity.cancelReason = data.cancelReason ?? entity.cancelReason;
    entity.minimumPrepTime = data.minimumPrepTime ?? entity.minimumPrepTime;
    entity.riderName = data.riderName ?? entity.riderName;
    entity.riderPhone = data.riderPhone ?? entity.riderPhone;
    entity.isModified = data.isModified ?? entity.isModified;

    const saved = await this.orderRepository.save(entity);
    return this.toOrderRecord(saved);
  }

  private toRestaurantRecord(
    entity: PetpoojaRestaurantEntity,
  ): PetpoojaRestaurantRecord {
    return {
      restId: entity.restId,
      name: entity.name,
      active: entity.active,
      storeStatus: entity.storeStatus,
      turnOnTime: entity.turnOnTime,
      closedReason: entity.closedReason,
    };
  }

  private toOrderRecord(entity: PetpoojaOrderEntity): PetpoojaOrderRecord {
    return {
      restId: entity.restId,
      orderId: entity.orderId,
      clientOrderId: entity.clientOrderId,
      status: entity.status,
      orderInfo: entity.orderInfo,
      cancelReason: entity.cancelReason,
      minimumPrepTime: entity.minimumPrepTime,
      riderName: entity.riderName,
      riderPhone: entity.riderPhone,
      isModified: entity.isModified,
    };
  }
}
