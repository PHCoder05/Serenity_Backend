import {
  BadRequestException,
  forwardRef,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import {
  ConfirmPaymentIntentDto,
  CreatePaymentIntentDto,
} from '../dto/serenity.dto';
import { PaymentIntentEntity } from '../infrastructure/persistence/relational/entities/payment-intent.entity';
import { PaymentWebhookEventEntity } from '../infrastructure/persistence/relational/entities/payment-webhook-event.entity';
import { PaymentGatewayConfigService } from '../payments/gateway/payment-gateway-config.service';
import { PaymentGatewayRegistry } from '../payments/gateway/payment-gateway.registry';
import { PaymentProviderId } from '../payments/gateway/payment-gateway.types';
import { PaymentOutboxService } from '../payments/outbox/payment-outbox.service';
import { OrdersService } from './orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
    @InjectRepository(PaymentWebhookEventEntity)
    private readonly webhookEventRepository: Repository<PaymentWebhookEventEntity>,
    private readonly gatewayConfig: PaymentGatewayConfigService,
    private readonly registry: PaymentGatewayRegistry,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => PaymentOutboxService))
    private readonly paymentOutbox: PaymentOutboxService,
  ) {}

  async createIntent(userId: number, dto: CreatePaymentIntentDto) {
    let amount = dto.amount;

    if (dto.method !== 'COD') {
      if (dto.items?.length) {
        const quote = await this.ordersService.quote(
          {
            items: dto.items,
            couponCode: dto.couponCode,
            redeemPoints: dto.redeemPoints,
          },
          userId,
        );
        amount = quote.total;
        if (dto.amount != null && dto.amount !== amount) {
          throw new BadRequestException({
            message: `Client amount ${dto.amount} does not match server total ${amount}`,
            code: 'PAYMENT_AMOUNT_MISMATCH',
          });
        }
      } else if (amount == null || amount < 1) {
        throw new BadRequestException({
          message: 'items or amount are required for online payment intents',
          code: 'PAYMENT_AMOUNT_REQUIRED',
        });
      }
    } else if (amount == null || amount < 1) {
      throw new BadRequestException({
        message: 'amount is required for COD intents',
        code: 'PAYMENT_AMOUNT_REQUIRED',
      });
    }

    const intent = await this.paymentIntentRepository.save(
      this.paymentIntentRepository.create({
        id: `pi-${randomUUID()}`,
        userId,
        amount: amount!,
        currency: dto.currency ?? 'INR',
        method: dto.method,
        status: 'created',
        provider: null,
        externalOrderRef: null,
        externalPaymentRef: null,
        externalReference: null,
        clientActionJson: null,
        refundRef: null,
        failureReason: null,
      }),
    );

    if (dto.method === 'COD') {
      return this.toDto(intent);
    }

    const gateway = await this.gatewayConfig.requireActive();
    const adapter = this.registry.get(gateway.provider);

    const checkout = await adapter.createCheckout(gateway.credentials, {
      intentId: intent.id,
      amountInr: intent.amount,
      currency: intent.currency,
      method: dto.method,
      mode: gateway.mode,
    });

    intent.status = 'requires_action';
    intent.provider = gateway.provider;
    intent.externalOrderRef = checkout.externalOrderRef;
    intent.clientActionJson = JSON.stringify(checkout.clientAction);
    await this.paymentIntentRepository.save(intent);

    return this.toDto(intent);
  }

  async getIntent(userId: number, id: string) {
    const intent = await this.requireUserIntent(userId, id);
    return this.toDto(intent);
  }

  async confirmIntent(
    userId: number,
    id: string,
    dto: ConfirmPaymentIntentDto = {},
  ) {
    const intent = await this.requireUserIntent(userId, id);

    if (intent.status === 'succeeded') {
      return this.toDto(intent);
    }
    if (intent.status === 'failed' || intent.status === 'refunded') {
      throw new BadRequestException({
        message: `Payment intent already ${intent.status}`,
        code: 'PAYMENT_VERIFY_FAILED',
      });
    }

    if (intent.method === 'COD') {
      intent.status = 'succeeded';
      intent.externalReference = dto.externalReference ?? `cod-${intent.id}`;
      intent.failureReason = null;
      await this.paymentIntentRepository.save(intent);
      return this.toDto(intent);
    }

    if (!intent.provider || !intent.externalOrderRef) {
      throw new BadRequestException({
        message: 'Payment intent has no gateway session',
        code: 'PAYMENT_VERIFY_FAILED',
      });
    }

    const gateway = await this.gatewayConfig.resolveProvider(
      intent.provider as PaymentProviderId,
    );
    const adapter = this.registry.get(gateway.provider);
    const payload: Record<string, string> = {
      ...(dto.clientResult ?? {}),
    };
    if (dto.externalReference) {
      payload.externalReference = dto.externalReference;
    }

    const result = await adapter.verifyClientConfirmation(gateway.credentials, {
      externalOrderRef: intent.externalOrderRef,
      payload,
    });

    if (result === 'failed') {
      intent.status = 'failed';
      intent.failureReason = 'Client verification failed';
      await this.paymentIntentRepository.save(intent);
      throw new BadRequestException({
        message: 'Payment verification failed',
        code: 'PAYMENT_VERIFY_FAILED',
      });
    }

    const paymentRef =
      payload.razorpay_payment_id ||
      payload.paymentId ||
      payload.mihpayid ||
      payload.paymentIntentId ||
      intent.externalPaymentRef;

    if (result === 'succeeded') {
      intent.status = 'succeeded';
      intent.failureReason = null;
      if (paymentRef) {
        intent.externalPaymentRef = paymentRef;
        intent.externalReference = paymentRef;
      }
    } else {
      // pending until webhook / next poll confirms capture
      intent.status = 'pending';
      if (paymentRef) {
        intent.externalPaymentRef = paymentRef;
        intent.externalReference = paymentRef;
      }
    }

    await this.paymentIntentRepository.save(intent);
    return this.toDto(intent);
  }

  async assertSucceededForOrder(input: {
    userId: number;
    paymentIntentId: string;
    orderTotal: number;
  }) {
    const intent = await this.requireUserIntent(
      input.userId,
      input.paymentIntentId,
    );
    if (intent.status !== 'succeeded') {
      throw new BadRequestException({
        message: `Payment intent is ${intent.status}; expected succeeded`,
        code: 'PAYMENT_INTENT_NOT_SUCCEEDED',
      });
    }
    if (intent.amount !== input.orderTotal) {
      throw new BadRequestException({
        message: 'Payment intent amount does not match order total',
        code: 'PAYMENT_AMOUNT_MISMATCH',
      });
    }
    return intent;
  }

  async applyProviderWebhook(
    provider: PaymentProviderId,
    input: {
      rawBody: Buffer | string;
      headers: Record<string, string | string[] | undefined>;
      parsedBody?: unknown;
      requireRawBody?: boolean;
    },
  ) {
    if (input.requireRawBody !== false && provider !== 'payu') {
      if (
        input.rawBody == null ||
        (typeof input.rawBody === 'string' && !input.rawBody.length) ||
        (Buffer.isBuffer(input.rawBody) && input.rawBody.length === 0)
      ) {
        throw new BadRequestException({
          message:
            'Raw request body required for webhook signature verification',
          code: 'PAYMENT_WEBHOOK_RAW_BODY_REQUIRED',
        });
      }
    }

    const gateway = await this.gatewayConfig.resolveProvider(provider);
    const adapter = this.registry.get(provider);

    let parsed;
    try {
      parsed = await adapter.parseWebhook(
        gateway.credentials,
        gateway.webhookSecret,
        input,
      );
    } catch (err: any) {
      throw new UnauthorizedException(
        err?.message || 'Invalid payment webhook signature',
      );
    }

    if (!parsed.eventId) {
      throw new BadRequestException('Webhook missing event id');
    }

    const recorded = await this.recordWebhookEvent({
      provider,
      eventId: parsed.eventId,
      externalOrderRef: parsed.externalOrderRef || null,
      status: parsed.status,
    });
    if (!recorded) {
      return { ok: true, status: 'duplicate' };
    }

    if (parsed.status === 'ignored' || !parsed.externalOrderRef) {
      return { ok: true, status: 'ignored' };
    }

    const intent = await this.paymentIntentRepository.findOne({
      where: { externalOrderRef: parsed.externalOrderRef },
    });
    if (!intent) {
      throw new NotFoundException('Payment intent not found for webhook');
    }

    if (
      parsed.status === 'succeeded' &&
      parsed.amountInr != null &&
      Number.isFinite(parsed.amountInr) &&
      Math.round(parsed.amountInr) !== intent.amount
    ) {
      intent.failureReason = `Webhook amount ${parsed.amountInr} != intent ${intent.amount}`;
      await this.paymentIntentRepository.save(intent);
      throw new BadRequestException({
        message: 'Webhook amount does not match payment intent',
        code: 'PAYMENT_AMOUNT_MISMATCH',
      });
    }

    if (intent.status === 'succeeded' && parsed.status === 'succeeded') {
      return this.toDto(intent);
    }
    if (intent.status === 'refunded') {
      return this.toDto(intent);
    }

    if (parsed.status === 'succeeded') {
      intent.status = 'succeeded';
      intent.failureReason = null;
      if (parsed.paymentRef) {
        intent.externalPaymentRef = parsed.paymentRef;
        intent.externalReference = parsed.paymentRef;
      }
    } else if (parsed.status === 'failed') {
      intent.status = 'failed';
      intent.failureReason = parsed.failureReason ?? 'Payment failed';
    }

    await this.paymentIntentRepository.save(intent);
    return this.toDto(intent);
  }

  legacyMockWebhook() {
    throw new GoneException({
      message:
        'Mock payment webhook removed. Use /v1/payments/webhooks/{razorpay|stripe|payu}',
      code: 'PAYMENT_WEBHOOK_GONE',
    });
  }

  async refundForOrderCancel(input: {
    paymentIntentId: string | null | undefined;
    reason?: string;
  }): Promise<{
    refunded: boolean;
    refundFailed?: boolean;
    refundQueued?: boolean;
    refundRef?: string;
  }> {
    if (!input.paymentIntentId) {
      return { refunded: false };
    }

    const result = await this.attemptPspRefund({
      paymentIntentId: input.paymentIntentId,
      reason: input.reason,
    });

    if (result.ok) {
      return { refunded: true, refundRef: result.refundRef };
    }

    if (result.skip) {
      return { refunded: false };
    }

    // Persist for automatic retry — order cancel already committed.
    await this.paymentOutbox.enqueueRefund({
      paymentIntentId: input.paymentIntentId,
      reason: input.reason,
    });

    return { refunded: false, refundFailed: true, refundQueued: true };
  }

  /**
   * Direct PSP refund attempt (used by cancel path + outbox worker).
   * Idempotent when intent already refunded.
   */
  async attemptPspRefund(input: {
    paymentIntentId: string;
    reason?: string;
  }): Promise<{
    ok: boolean;
    skip?: boolean;
    refundRef?: string;
    error?: string;
  }> {
    const intent = await this.paymentIntentRepository.findOne({
      where: { id: input.paymentIntentId },
    });
    if (!intent) {
      return { ok: false, skip: true, error: 'Payment intent not found' };
    }
    if (intent.method === 'COD') {
      return { ok: false, skip: true };
    }
    if (intent.status === 'refunded') {
      return { ok: true, refundRef: intent.refundRef ?? undefined };
    }
    if (intent.status !== 'succeeded') {
      return {
        ok: false,
        skip: true,
        error: `Intent status is ${intent.status}`,
      };
    }

    const paymentRef =
      intent.provider === 'stripe'
        ? intent.externalOrderRef || intent.externalPaymentRef
        : intent.externalPaymentRef || intent.externalReference;

    if (!intent.provider || !paymentRef) {
      return { ok: false, error: 'Missing provider payment reference' };
    }

    try {
      const gateway = await this.gatewayConfig.resolveProvider(
        intent.provider as PaymentProviderId,
      );
      const adapter = this.registry.get(gateway.provider);
      const result = await adapter.refund(gateway.credentials, {
        paymentRef,
        amountInr: intent.amount,
        reason: input.reason,
        mode: gateway.mode,
      });
      intent.status = 'refunded';
      intent.refundRef = result.refundRef;
      await this.paymentIntentRepository.save(intent);
      return { ok: true, refundRef: result.refundRef };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'PSP refund failed',
      };
    }
  }

  private async recordWebhookEvent(input: {
    provider: PaymentProviderId;
    eventId: string;
    externalOrderRef: string | null;
    status: string;
  }): Promise<boolean> {
    try {
      await this.webhookEventRepository.insert({
        provider: input.provider,
        eventId: input.eventId,
        externalOrderRef: input.externalOrderRef,
        status: input.status,
      });
      return true;
    } catch (err) {
      if (
        err instanceof QueryFailedError ||
        (err as any)?.code === '23505' ||
        String((err as any)?.message || '').includes('UQ_payment_webhook_event')
      ) {
        return false;
      }
      throw err;
    }
  }

  private async requireUserIntent(userId: number, id: string) {
    const intent = await this.paymentIntentRepository.findOne({
      where: { id, userId },
    });
    if (!intent) throw new NotFoundException('Payment intent not found');
    return intent;
  }

  private toDto(intent: PaymentIntentEntity) {
    let clientAction: unknown = null;
    if (intent.clientActionJson) {
      try {
        clientAction = JSON.parse(intent.clientActionJson);
      } catch {
        clientAction = null;
      }
    }

    return {
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      method: intent.method,
      status: intent.status as
        | 'created'
        | 'requires_action'
        | 'pending'
        | 'succeeded'
        | 'failed'
        | 'refunded',
      provider: intent.provider,
      externalReference: intent.externalReference,
      externalOrderRef: intent.externalOrderRef,
      externalPaymentRef: intent.externalPaymentRef,
      clientAction,
      failureReason: intent.failureReason,
      refundRef: intent.refundRef,
      updatedAt: intent.updatedAt.toISOString(),
    };
  }
}
