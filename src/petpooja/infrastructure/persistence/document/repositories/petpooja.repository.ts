import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  PetpoojaItemStockRecord,
  PetpoojaOrderRecord,
  PetpoojaRepository,
  PetpoojaRestaurantRecord,
} from '../../petpooja.repository';
import {
  PetpoojaMenuItemStockSchemaClass,
  PetpoojaMenuSnapshotSchemaClass,
  PetpoojaOrderSchemaClass,
  PetpoojaRestaurantSchemaClass,
} from '../entities/petpooja.schema';

@Injectable()
export class PetpoojaDocumentRepository implements PetpoojaRepository {
  constructor(
    @InjectModel(PetpoojaRestaurantSchemaClass.name)
    private readonly restaurantModel: Model<PetpoojaRestaurantSchemaClass>,
    @InjectModel(PetpoojaMenuSnapshotSchemaClass.name)
    private readonly menuSnapshotModel: Model<PetpoojaMenuSnapshotSchemaClass>,
    @InjectModel(PetpoojaMenuItemStockSchemaClass.name)
    private readonly itemStockModel: Model<PetpoojaMenuItemStockSchemaClass>,
    @InjectModel(PetpoojaOrderSchemaClass.name)
    private readonly orderModel: Model<PetpoojaOrderSchemaClass>,
  ) {}

  async upsertRestaurant(
    data: PetpoojaRestaurantRecord,
  ): Promise<PetpoojaRestaurantRecord> {
    const entity = await this.restaurantModel.findOneAndUpdate(
      { restId: data.restId },
      {
        $set: {
          name: data.name,
          active: data.active,
          storeStatus: data.storeStatus,
          turnOnTime: data.turnOnTime,
          closedReason: data.closedReason,
        },
        $setOnInsert: { restId: data.restId },
      },
      { upsert: true, new: true },
    );

    return this.toRestaurantRecord(entity);
  }

  async getRestaurant(
    restId: string,
  ): Promise<NullableType<PetpoojaRestaurantRecord>> {
    const entity = await this.restaurantModel.findOne({ restId }).exec();
    return entity ? this.toRestaurantRecord(entity) : null;
  }

  async saveMenuSnapshot(
    restId: string,
    payload: Record<string, unknown>,
    source: 'push' | 'fetch',
  ): Promise<void> {
    await this.menuSnapshotModel.create({
      restId,
      payload,
      source,
    });
  }

  async upsertItemStock(records: PetpoojaItemStockRecord[]): Promise<void> {
    for (const record of records) {
      await this.itemStockModel.findOneAndUpdate(
        {
          restId: record.restId,
          itemId: record.itemId,
          type: record.type,
        },
        {
          $set: {
            inStock: record.inStock,
            autoTurnOnTime: record.autoTurnOnTime ?? null,
            customTurnOnTime: record.customTurnOnTime ?? null,
          },
          $setOnInsert: {
            restId: record.restId,
            itemId: record.itemId,
            type: record.type,
          },
        },
        { upsert: true },
      );
    }
  }

  async upsertOrder(data: PetpoojaOrderRecord): Promise<PetpoojaOrderRecord> {
    const entity = await this.orderModel.findOneAndUpdate(
      { restId: data.restId, orderId: data.orderId },
      {
        $set: {
          clientOrderId: data.clientOrderId,
          status: data.status,
          orderInfo: data.orderInfo,
          cancelReason: data.cancelReason,
          minimumPrepTime: data.minimumPrepTime,
          riderName: data.riderName,
          riderPhone: data.riderPhone,
          isModified: data.isModified,
        },
        $setOnInsert: {
          restId: data.restId,
          orderId: data.orderId,
        },
      },
      { upsert: true, new: true },
    );

    return this.toOrderRecord(entity);
  }

  private toRestaurantRecord(
    entity: PetpoojaRestaurantSchemaClass,
  ): PetpoojaRestaurantRecord {
    return {
      restId: entity.restId,
      name: entity.name ?? null,
      active: entity.active ?? null,
      storeStatus: entity.storeStatus,
      turnOnTime: entity.turnOnTime ?? null,
      closedReason: entity.closedReason ?? null,
    };
  }

  private toOrderRecord(entity: PetpoojaOrderSchemaClass): PetpoojaOrderRecord {
    return {
      restId: entity.restId,
      orderId: entity.orderId,
      clientOrderId: entity.clientOrderId ?? null,
      status: entity.status,
      orderInfo: entity.orderInfo ?? null,
      cancelReason: entity.cancelReason ?? null,
      minimumPrepTime: entity.minimumPrepTime ?? null,
      riderName: entity.riderName ?? null,
      riderPhone: entity.riderPhone ?? null,
      isModified: entity.isModified ?? null,
    };
  }
}
