import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, IsNull, Not, Repository } from 'typeorm';
import { normalizePhone } from '../../auth/utils/phone.util';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { DietPreferenceEntity } from '../infrastructure/persistence/relational/entities/diet-preference.entity';
import { UserProfileEntity } from '../infrastructure/persistence/relational/entities/user-profile.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { OrderStatusHistoryEntity } from '../infrastructure/persistence/relational/entities/order-status-history.entity';
import { toOrderListItemDto } from '../mappers';
import { LoyaltyService } from './loyalty.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository: Repository<UserProfileEntity>,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(OrderStatusHistoryEntity)
    private readonly historyRepository: Repository<OrderStatusHistoryEntity>,
    @Optional()
    private readonly loyaltyService?: LoyaltyService,
    @Optional()
    @InjectRepository(DietPreferenceEntity)
    private readonly dietRepository?: Repository<DietPreferenceEntity>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async searchCustomers(qRaw?: string) {
    const q = qRaw?.trim() ?? '';
    if (q.length < 2) {
      throw new BadRequestException({
        message: 'q must be at least 2 characters',
        code: 'SUPPORT_QUERY_TOO_SHORT',
      });
    }

    const phone = normalizePhone(q);
    const profiles =
      phone.length >= 8
        ? await this.profileRepository.find({
            where: { phone: ILike(`%${phone}%`) },
            take: 20,
          })
        : [];

    const usersByEmail = await this.userRepository.find({
      where: [
        { email: ILike(`%${q.toLowerCase()}%`) },
        { firstName: ILike(`%${q}%`) },
        { lastName: ILike(`%${q}%`) },
      ],
      take: 20,
    });

    const byId = new Map<number, UserEntity>();
    for (const user of usersByEmail) {
      byId.set(user.id, user);
    }
    for (const profile of profiles) {
      if (!byId.has(profile.userId)) {
        const user = await this.userRepository.findOne({
          where: { id: profile.userId },
        });
        if (user) byId.set(user.id, user);
      }
    }

    const userIds = [...byId.keys()];
    const profileByUser = new Map(
      (userIds.length
        ? await this.profileRepository.find({
            where: { userId: In(userIds) },
          })
        : []
      ).map((profile) => [profile.userId, profile]),
    );
    const diets = this.dietRepository ? await this.dietRepository.find() : [];
    const dietLabel = new Map(diets.map((diet) => [diet.id, diet.label]));
    const users = [...byId.values()].slice(0, 20);
    const points = new Map<number, number>();
    if (this.loyaltyService) {
      await Promise.all(
        users.map(async (user) => {
          points.set(user.id, await this.loyaltyService!.getBalance(user.id));
        }),
      );
    }

    return {
      data: users.map((user) => {
        const profile = profileByUser.get(user.id);
        const dietPreferenceIds = profile?.dietPreferenceIds ?? [];
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          provider: user.provider,
          phone: profile?.phone ?? null,
          loyaltyPoints: points.get(user.id) ?? 0,
          dietPreferences: dietPreferenceIds.map((id) => ({
            id,
            label: dietLabel.get(id) ?? id,
          })),
        };
      }),
    };
  }

  async searchOrders(qRaw?: string) {
    const q = qRaw?.trim() ?? '';
    if (q.length < 2) {
      throw new BadRequestException({
        message: 'q must be at least 2 characters',
        code: 'SUPPORT_QUERY_TOO_SHORT',
      });
    }

    const phone = normalizePhone(q);
    const qb = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.lineItems', 'lineItems')
      .orderBy('o.orderedAt', 'DESC')
      .take(30);

    if (q.startsWith('order-') || q.startsWith('ord-')) {
      qb.where('o.id = :id', { id: q });
    } else if (/^\d+$/.test(q) && q.length < 8) {
      qb.where('o.userId = :userId', { userId: Number(q) });
    } else if (phone.length >= 8) {
      qb.where('o.guestPhone ILIKE :phone', { phone: `%${phone}%` });
    } else {
      qb.where('o.id ILIKE :id', { id: `%${q}%` }).orWhere(
        'o.itemSummary ILIKE :summary',
        { summary: `%${q}%` },
      );
    }

    const orders = await qb.getMany();
    return {
      data: orders.map((order) => this.toSupportOrder(order)),
    };
  }

  async listFeedback() {
    const orders = await this.orderRepository.find({
      where: { feedbackAt: Not(IsNull()) },
      order: { feedbackAt: 'DESC' },
      take: 50,
    });
    return {
      data: orders.map((order) => ({
        orderId: order.id,
        userId: order.userId,
        item: order.itemSummary,
        foodRating: order.foodRating,
        serviceRating: order.serviceRating,
        note: order.feedbackNote,
        submittedAt: order.feedbackAt?.toISOString() ?? null,
        fulfillmentType: order.fulfillmentType,
        orderedAt: order.orderedAt.toISOString(),
      })),
    };
  }

  async collectPayment(id: string) {
    const order = await this.requireOpenOrder(id);
    order.amountPaid = order.total;
    await this.orderRepository.save(order);
    return this.toSupportOrder(order);
  }

  async markServed(id: string) {
    const order = await this.requireOpenOrder(id);
    if (order.status !== 'delivered') {
      const fromStatus = order.status;
      order.status = 'delivered';
      await this.orderRepository.save(order);
      await this.historyRepository.save(
        this.historyRepository.create({
          orderId: order.id,
          fromStatus,
          toStatus: 'delivered',
          source: 'counter',
          note: 'Marked served at the counter',
        }),
      );
      await this.notifyOrder(
        order,
        'order-ready',
        'Order ready',
        'Your order has been served.',
      );
    }
    return this.toSupportOrder(order);
  }

  private async requireOpenOrder(id: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      });
    }
    if (order.status === 'cancelled') {
      throw new BadRequestException({
        message: 'Cancelled orders cannot be updated at the counter',
        code: 'ORDER_CANCELLED',
      });
    }
    return order;
  }

  private async notifyOrder(
    order: SerenityOrderEntity,
    type: string,
    title: string,
    body: string,
  ) {
    if (!order.userId || !this.notificationsService) return;
    try {
      await this.notificationsService.create({
        userId: order.userId,
        type,
        title,
        body,
        meta: { orderId: order.id },
      });
    } catch {
      // Inbox is best-effort and must not block the counter.
    }
  }

  private toSupportOrder(order: SerenityOrderEntity) {
    return {
      ...toOrderListItemDto(order),
      userId: order.userId,
      guestPhone: order.guestPhone,
      isGuestCheckout: order.isGuestCheckout,
      paidVia: order.paidVia,
      amountPaid: order.amountPaid,
    };
  }
}
