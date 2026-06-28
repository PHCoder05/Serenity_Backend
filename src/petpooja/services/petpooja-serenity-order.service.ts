import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SerenityOrderEntity } from '../../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { StoreStatusEntity } from '../../serenity/infrastructure/persistence/relational/entities/store-status.entity';
import { OrderCallbackDto } from '../dto/order-callback.dto';
import { UpdateStoreStatusDto } from '../dto/store-status.dto';
import { mapSerenityStatusFromPetpooja } from '../mappers/petpooja-order.mapper';

@Injectable()
export class PetpoojaSerenityOrderService {
  private readonly logger = new Logger(PetpoojaSerenityOrderService.name);

  constructor(
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
  ) {}

  async applyOrderCallback(dto: OrderCallbackDto): Promise<boolean> {
    const serenityStatus = mapSerenityStatusFromPetpooja(dto.status);
    const order =
      (await this.orderRepository.findOne({ where: { id: dto.orderID } })) ??
      (await this.orderRepository.findOne({
        where: { petpoojaOrderId: dto.orderID },
      }));

    if (!order) {
      this.logger.warn(
        `No Serenity order found for PetPooja callback orderID=${dto.orderID}`,
      );
      return false;
    }

    await this.orderRepository.update(order.id, {
      status: serenityStatus,
      petpoojaOrderId: order.petpoojaOrderId ?? dto.orderID,
      cancelReason: dto.cancel_reason ?? null,
      kitchenSyncStatus:
        serenityStatus === 'cancelled' ? 'cancelled' : 'submitted',
    });

    return true;
  }

  async applyStoreStatus(dto: UpdateStoreStatusDto): Promise<void> {
    const isOpen = String(dto.store_status) === '1';
    const store =
      (await this.storeRepository.findOne({ where: { id: 1 } })) ??
      this.storeRepository.create({ id: 1, isOpen: true });

    store.isOpen = isOpen;
    store.message =
      dto.reason ?? (isOpen ? null : 'Store is temporarily closed');
    store.nextOpenAt = dto.turn_on_time ? new Date(dto.turn_on_time) : null;

    await this.storeRepository.save(store);
  }
}
