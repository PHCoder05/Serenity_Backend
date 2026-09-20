import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SerenityOrderEntity } from '../../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { StoreStatusEntity } from '../../serenity/infrastructure/persistence/relational/entities/store-status.entity';
import { OrderStatusHistoryEntity } from '../../serenity/infrastructure/persistence/relational/entities/order-status-history.entity';
import { OutletEntity } from '../../serenity/infrastructure/persistence/relational/entities/outlet.entity';
import { OrderCallbackDto } from '../dto/order-callback.dto';
import { UpdateStoreStatusDto } from '../dto/store-status.dto';
import {
  isStatusProgression,
  mapSerenityStatusFromPetpooja,
} from '../mappers/petpooja-order.mapper';
import { PetpoojaRepository } from '../infrastructure/persistence/petpooja.repository';

@Injectable()
export class PetpoojaSerenityOrderService {
  private readonly logger = new Logger(PetpoojaSerenityOrderService.name);

  constructor(
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    @InjectRepository(OrderStatusHistoryEntity)
    private readonly historyRepository: Repository<OrderStatusHistoryEntity>,
    @InjectRepository(OutletEntity)
    private readonly outletRepository: Repository<OutletEntity>,
    private readonly petpoojaRepository: PetpoojaRepository,
  ) {}

  async applyOrderCallback(dto: OrderCallbackDto): Promise<boolean> {
    const order = await this.resolveSerenityOrder(dto.orderID);

    if (!order) {
      this.logger.warn(
        `No Serenity order found for PetPooja callback orderID=${dto.orderID}`,
      );
      return false;
    }

    const riderPatch = this.riderPatchFromCallback(dto);

    const mapped = mapSerenityStatusFromPetpooja(dto.status);
    if (mapped === null) {
      this.logger.warn(
        `Unknown PetPooja status=${dto.status} for order ${order.id}; leaving status=${order.status}`,
      );
      if (Object.keys(riderPatch).length) {
        await this.orderRepository.update(order.id, riderPatch);
      }
      return true;
    }
    const nextStatus = mapped;

    if (!isStatusProgression(order.status, nextStatus)) {
      this.logger.warn(
        `Ignoring regressive PetPooja status ${dto.status} (${order.status} → ${nextStatus}) for ${order.id}`,
      );
      await this.appendHistory({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        source: 'petpooja',
        rawStatus: dto.status,
        note: 'ignored_regress',
      });
      if (Object.keys(riderPatch).length) {
        await this.orderRepository.update(order.id, riderPatch);
      }
      return true;
    }

    const posId =
      dto.orderID &&
      dto.orderID.trim() !== '' &&
      dto.orderID !== order.id &&
      !order.petpoojaOrderId
        ? dto.orderID.trim()
        : undefined;

    await this.orderRepository.update(order.id, {
      status: nextStatus,
      petpoojaOrderId: posId ?? order.petpoojaOrderId,
      cancelReason:
        nextStatus === 'cancelled'
          ? (dto.cancel_reason ?? order.cancelReason)
          : order.cancelReason,
      kitchenSyncStatus: nextStatus === 'cancelled' ? 'cancelled' : 'synced',
      ...riderPatch,
    });

    await this.appendHistory({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: nextStatus,
      source: 'petpooja',
      rawStatus: dto.status,
      note: dto.cancel_reason ?? null,
    });

    return true;
  }

  private riderPatchFromCallback(dto: OrderCallbackDto): {
    riderName?: string;
    riderPhone?: string;
  } {
    const patch: { riderName?: string; riderPhone?: string } = {};
    const name = dto.rider_name?.trim();
    const phone = dto.rider_phone_number?.trim();
    if (name) patch.riderName = name;
    if (phone) patch.riderPhone = phone;
    return patch;
  }

  async applyStoreStatus(dto: UpdateStoreStatusDto): Promise<void> {
    const isOpen = String(dto.store_status) === '1';
    const outlet =
      (await this.outletRepository.findOne({
        where: { petpoojaRestId: dto.restID },
      })) ??
      (await this.outletRepository.findOne({ where: { isDefault: true } }));

    const store =
      (outlet
        ? await this.storeRepository.findOne({
            where: { outletId: outlet.id },
          })
        : null) ??
      (await this.storeRepository.findOne({ where: { id: 1 } })) ??
      this.storeRepository.create({ id: 1, isOpen: true });

    if (outlet) {
      store.outletId = outlet.id;
    }
    store.isOpen = isOpen;
    store.message =
      dto.reason ?? (isOpen ? null : 'Store is temporarily closed');
    store.nextOpenAt = this.parseTurnOnTime(dto.turn_on_time);

    await this.storeRepository.save(store);
  }

  private async resolveSerenityOrder(
    externalId: string,
  ): Promise<SerenityOrderEntity | null> {
    if (!externalId?.trim()) {
      return null;
    }

    const byPos = await this.orderRepository.findOne({
      where: { petpoojaOrderId: externalId },
    });
    if (byPos) {
      return byPos;
    }

    const byId = await this.orderRepository.findOne({
      where: { id: externalId },
    });
    if (byId) {
      return byId;
    }

    const bridge =
      await this.petpoojaRepository.findOrderByExternalId(externalId);
    const serenityId = bridge?.clientOrderId ?? null;
    if (!serenityId) {
      return null;
    }

    return this.orderRepository.findOne({ where: { id: serenityId } });
  }

  private async appendHistory(input: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    source: string;
    rawStatus: string | null;
    note: string | null;
  }): Promise<void> {
    await this.historyRepository.save(
      this.historyRepository.create({
        orderId: input.orderId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        source: input.source,
        rawStatus: input.rawStatus,
        note: input.note,
      }),
    );
  }

  /**
   * PetPooja sends either a full datetime ("2023-02-17 00:00:00") or a
   * clock time ("00:00" / "18:30"). Invalid values become null.
   */
  private parseTurnOnTime(raw?: string): Date | null {
    if (!raw?.trim()) {
      return null;
    }

    const value = raw.trim();
    const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (timeOnly) {
      const hours = Number(timeOnly[1]);
      const minutes = Number(timeOnly[2]);
      const seconds = Number(timeOnly[3] ?? '0');
      if (
        hours > 23 ||
        minutes > 59 ||
        seconds > 59 ||
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        Number.isNaN(seconds)
      ) {
        return null;
      }

      const next = new Date();
      next.setSeconds(seconds, 0);
      next.setHours(hours, minutes, seconds, 0);
      if (next.getTime() <= Date.now()) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    const parsed = new Date(value.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
