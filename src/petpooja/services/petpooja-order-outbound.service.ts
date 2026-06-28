import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { AllConfigType } from '../../config/config.type';
import { SerenityOrderEntity } from '../../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { UserProfileEntity } from '../../serenity/infrastructure/persistence/relational/entities/user-profile.entity';
import { CreateOrderDto } from '../../serenity/dto/serenity.dto';
import { MenuItemEntity } from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import {
  buildPetpoojaSaveOrderPayload,
  canPushOrderToPetpooja,
  SerenityOrderLineInput,
} from '../mappers/petpooja-order.mapper';
import { PetpoojaRepository } from '../infrastructure/persistence/petpooja.repository';
import { SaveOrderDto } from '../dto/save-order.dto';

type PricedOrderLine = {
  menuItem: MenuItemEntity;
  quantity: number;
  unitPrice: number;
  variantId?: string;
  extraIds?: string[];
  detail?: string;
};

@Injectable()
export class PetpoojaOrderOutboundService {
  private readonly logger = new Logger(PetpoojaOrderOutboundService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly petpoojaRepository: PetpoojaRepository,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository: Repository<UserProfileEntity>,
  ) {}

  isEnabled(): boolean {
    const enabled = this.configService.get('petpooja.orderSyncEnabled', {
      infer: true,
    });
    const restId = this.configService.get('petpooja.restaurantId', {
      infer: true,
    });

    return Boolean(enabled ?? true) && Boolean(restId);
  }

  async pushSerenityOrder(input: {
    order: SerenityOrderEntity;
    dto: CreateOrderDto;
    pricedLines: PricedOrderLine[];
    subtotal: number;
    gst: number;
    total: number;
  }): Promise<void> {
    if (!this.isEnabled()) {
      await this.markKitchenSync(input.order.id, 'disabled');
      return;
    }

    const lines: SerenityOrderLineInput[] = input.pricedLines.map((line) => ({
      menuItem: line.menuItem,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      variantId: line.variantId,
      extraIds: line.extraIds,
      detail: line.detail,
    }));

    if (!canPushOrderToPetpooja(lines)) {
      this.logger.warn(
        `Skipping PetPooja push for ${input.order.id}: one or more items lack petpoojaItemId`,
      );
      await this.markKitchenSync(input.order.id, 'skipped');
      return;
    }

    const customer = await this.getCustomerDetails(input.order.userId);
    const restId = this.configService.get('petpooja.restaurantId', {
      infer: true,
    }) as string;

    const payload = buildPetpoojaSaveOrderPayload({
      restId,
      orderId: input.order.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deliveryAddress: input.dto.deliveryAddress,
      paymentMethod: input.dto.paymentMethod,
      note: input.dto.note,
      items: lines,
      subtotal: input.subtotal,
      gst: input.gst,
      total: input.total,
      orderedAt: input.order.orderedAt,
    });

    await this.petpoojaRepository.upsertOrder({
      restId,
      orderId: input.order.id,
      clientOrderId: input.order.id,
      status: 'pending',
      orderInfo: payload.orderinfo as Record<string, unknown>,
    });

    try {
      const response = await this.postOrderWithRetry(payload);

      const petpoojaOrderId =
        response.data?.orderID != null ? String(response.data.orderID) : null;

      await this.orderRepository.update(input.order.id, {
        kitchenSyncStatus: 'submitted',
        petpoojaOrderId,
      });

      await this.petpoojaRepository.upsertOrder({
        restId,
        orderId: petpoojaOrderId ?? input.order.id,
        clientOrderId: input.order.id,
        status: 'submitted',
        orderInfo: payload.orderinfo as Record<string, unknown>,
      });
    } catch (error: any) {
      this.logger.error(
        `PetPooja push failed for ${input.order.id}: ${error.message}`,
        error.stack,
      );
      await this.markKitchenSync(input.order.id, 'failed');
    }
  }

  private async postOrderWithRetry(payload: SaveOrderDto) {
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await firstValueFrom(
          this.httpService.post(
            this.configService.get('petpooja.saveOrderUrl', {
              infer: true,
            }) as string,
            payload,
            {
              headers: {
                'app-key': this.configService.get('petpooja.appKey', {
                  infer: true,
                }),
                'app-secret': this.configService.get('petpooja.appSecret', {
                  infer: true,
                }),
                'access-token': this.configService.get('petpooja.accessToken', {
                  infer: true,
                }),
                'Content-Type': 'application/json',
              },
            },
          ),
        );
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `PetPooja push retry ${attempt}/${maxAttempts} failed: ${error.message}`,
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        }
      }
    }

    throw lastError ?? new Error('Unknown PetPooja error');
  }

  private async markKitchenSync(orderId: string, status: string) {
    await this.orderRepository.update(orderId, { kitchenSyncStatus: status });
  }

  private async getCustomerDetails(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const profile = await this.profileRepository.findOne({ where: { userId } });

    return {
      name: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
      phone: profile?.phone ?? '',
    };
  }
}
