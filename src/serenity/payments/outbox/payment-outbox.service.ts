import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, In, Repository } from 'typeorm';
import { PaymentOutboxEntity } from '../../infrastructure/persistence/relational/entities/payment-outbox.entity';
import { PaymentsService } from '../../services/payments.service';

const DEFAULT_POLL_MS = 30_000;
const BATCH_SIZE = 10;

@Injectable()
export class PaymentOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentOutboxService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectRepository(PaymentOutboxEntity)
    private readonly outboxRepository: Repository<PaymentOutboxEntity>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  onModuleInit() {
    if (process.env.PAYMENT_OUTBOX_ENABLED === 'false') {
      this.logger.warn('Payment outbox poller disabled');
      return;
    }
    const ms = Number(process.env.PAYMENT_OUTBOX_POLL_MS || DEFAULT_POLL_MS);
    this.timer = setInterval(
      () => {
        void this.processDue();
      },
      Number.isFinite(ms) && ms >= 5_000 ? ms : DEFAULT_POLL_MS,
    );
    // Kick once shortly after boot
    setTimeout(() => void this.processDue(), 3_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enqueueRefund(input: {
    paymentIntentId: string;
    reason?: string;
  }): Promise<PaymentOutboxEntity> {
    const existing = await this.outboxRepository.findOne({
      where: {
        type: 'refund',
        paymentIntentId: input.paymentIntentId,
        status: In(['pending', 'processing']),
      },
    });
    if (existing) {
      return existing;
    }

    return this.outboxRepository.save(
      this.outboxRepository.create({
        type: 'refund',
        paymentIntentId: input.paymentIntentId,
        payload: JSON.stringify({ reason: input.reason ?? null }),
        status: 'pending',
        attempts: 0,
        maxAttempts: 8,
        nextAttemptAt: new Date(),
        lastError: null,
      }),
    );
  }

  async list(status?: string) {
    const where = status ? { status } : {};
    const rows = await this.outboxRepository.find({
      where,
      order: { id: 'DESC' },
      take: 100,
    });
    return rows.map((row) => this.toDto(row));
  }

  async counts() {
    const [pending, processing, dead, done] = await Promise.all([
      this.outboxRepository.count({ where: { status: 'pending' } }),
      this.outboxRepository.count({ where: { status: 'processing' } }),
      this.outboxRepository.count({ where: { status: 'dead' } }),
      this.outboxRepository.count({ where: { status: 'done' } }),
    ]);
    return { pending, processing, dead, done };
  }

  async retry(id: number) {
    const row = await this.outboxRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Outbox job not found');
    row.status = 'pending';
    row.nextAttemptAt = new Date();
    row.lastError = null;
    await this.outboxRepository.save(row);
    void this.processDue();
    return this.toDto(row);
  }

  async processDue() {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.outboxRepository.find({
        where: {
          status: 'pending',
          nextAttemptAt: LessThanOrEqual(new Date()),
        },
        order: { nextAttemptAt: 'ASC' },
        take: BATCH_SIZE,
      });

      for (const job of due) {
        await this.processOne(job.id);
      }
    } catch (err: any) {
      this.logger.error(`Outbox poll failed: ${err?.message || err}`);
    } finally {
      this.running = false;
    }
  }

  private async processOne(id: number) {
    const claimed = await this.outboxRepository.update(
      { id, status: 'pending' },
      { status: 'processing' },
    );
    if (!claimed.affected) return;

    const job = await this.outboxRepository.findOne({ where: { id } });
    if (!job) return;

    try {
      if (job.type !== 'refund') {
        throw new Error(`Unsupported outbox type: ${job.type}`);
      }
      const payload = job.payload ? JSON.parse(job.payload) : {};
      const result = await this.paymentsService.attemptPspRefund({
        paymentIntentId: job.paymentIntentId,
        reason: payload.reason ?? undefined,
      });

      if (result.ok) {
        job.status = 'done';
        job.lastError = null;
        job.attempts += 1;
        await this.outboxRepository.save(job);
        return;
      }

      await this.failAttempt(job, result.error || 'Refund failed');
    } catch (err: any) {
      await this.failAttempt(job, err?.message || 'Outbox processing error');
    }
  }

  private async failAttempt(job: PaymentOutboxEntity, error: string) {
    job.attempts += 1;
    job.lastError = error.slice(0, 2000);
    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
      this.logger.error(
        `Outbox job ${job.id} dead after ${job.attempts} attempts: ${error}`,
      );
    } else {
      job.status = 'pending';
      const delaySec = Math.min(30 * 2 ** (job.attempts - 1), 3600);
      job.nextAttemptAt = new Date(Date.now() + delaySec * 1000);
      this.logger.warn(
        `Outbox job ${job.id} retry in ${delaySec}s (attempt ${job.attempts}): ${error}`,
      );
    }
    await this.outboxRepository.save(job);
  }

  private toDto(row: PaymentOutboxEntity) {
    return {
      id: row.id,
      type: row.type,
      paymentIntentId: row.paymentIntentId,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      nextAttemptAt: row.nextAttemptAt.toISOString(),
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
