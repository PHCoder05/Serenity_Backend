import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentIntentDto, PaymentWebhookDto } from '../dto/serenity.dto';
import { PaymentIntentEntity } from '../infrastructure/persistence/relational/entities/payment-intent.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
  ) {}

  async createIntent(userId: number, dto: CreatePaymentIntentDto) {
    const intent = await this.paymentIntentRepository.save(
      this.paymentIntentRepository.create({
        id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        method: dto.method,
        status: 'created',
        externalReference: null,
        failureReason: null,
      }),
    );

    return this.toDto(intent);
  }

  async getIntent(userId: number, id: string) {
    const intent = await this.paymentIntentRepository.findOne({
      where: { id, userId },
    });
    if (!intent) throw new NotFoundException('Payment intent not found');
    return this.toDto(intent);
  }

  async applyWebhook(dto: PaymentWebhookDto) {
    const intent = await this.paymentIntentRepository.findOne({
      where: { id: dto.paymentIntentId },
    });
    if (!intent) throw new NotFoundException('Payment intent not found');

    intent.status = dto.status;
    intent.externalReference =
      dto.externalReference ?? intent.externalReference;
    intent.failureReason = dto.failureReason ?? null;
    await this.paymentIntentRepository.save(intent);

    return this.toDto(intent);
  }

  private toDto(intent: PaymentIntentEntity) {
    return {
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      method: intent.method,
      status: intent.status,
      externalReference: intent.externalReference,
      failureReason: intent.failureReason,
      updatedAt: intent.updatedAt.toISOString(),
    };
  }
}
