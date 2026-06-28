import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';
import { PaymentIntentEntity } from '../infrastructure/persistence/relational/entities/payment-intent.entity';
import { EventEntity } from '../infrastructure/persistence/relational/entities/event.entity';

@Injectable()
export class DiagnosticsService {
  constructor(
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentRepository: Repository<PaymentIntentEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  async getSnapshot() {
    const [orders, failedKitchenOrders, paymentsFailed, eventsCount] =
      await Promise.all([
        this.orderRepository.count(),
        this.orderRepository.count({ where: { kitchenSyncStatus: 'failed' } }),
        this.paymentRepository.count({ where: { status: 'failed' } }),
        this.eventRepository.count(),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        orders,
        failedKitchenOrders,
        failedPayments: paymentsFailed,
        events: eventsCount,
      },
    };
  }
}
