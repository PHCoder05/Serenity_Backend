import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { normalizePhone } from '../../auth/utils/phone.util';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { UserProfileEntity } from '../infrastructure/persistence/relational/entities/user-profile.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { OrderStatusHistoryEntity } from '../infrastructure/persistence/relational/entities/order-status-history.entity';
import { toOrderListItemDto } from '../mappers';

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

    return {
      data: [...byId.values()].slice(0, 20).map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        provider: user.provider,
        phone: profileByUser.get(user.id)?.phone ?? null,
      })),
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
