import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayConfigEntity } from '../../infrastructure/persistence/relational/entities/payment-gateway-config.entity';
import { PaymentGatewayAuditEntity } from '../../infrastructure/persistence/relational/entities/payment-gateway-audit.entity';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../crypto/credentials-crypto';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import {
  GatewayCredentials,
  GatewayMode,
  PAYMENT_PROVIDERS,
  PaymentProviderId,
} from './payment-gateway.types';

export type ResolvedGateway = {
  provider: PaymentProviderId;
  mode: GatewayMode;
  credentials: GatewayCredentials;
  webhookSecret: string | null;
  source: 'db' | 'env';
};

@Injectable()
export class PaymentGatewayConfigService {
  constructor(
    @InjectRepository(PaymentGatewayConfigEntity)
    private readonly configRepository: Repository<PaymentGatewayConfigEntity>,
    @InjectRepository(PaymentGatewayAuditEntity)
    private readonly auditRepository: Repository<PaymentGatewayAuditEntity>,
    private readonly registry: PaymentGatewayRegistry,
  ) {}

  listGateways() {
    return this.registry.list().map((provider) => ({
      provider,
      // filled async by caller if needed — sync snapshot below via Promise
    }));
  }

  async listGatewaysDetailed() {
    const rows = await this.configRepository.find();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    const active = await this.resolveActiveOptional();

    return this.registry.list().map((provider) => {
      const row = byProvider.get(provider);
      const envConfigured = this.envHasCredentials(provider);
      return {
        provider,
        configured: Boolean(row) || envConfigured,
        isActive: active?.provider === provider,
        mode: (row?.mode as GatewayMode) || this.envMode(provider) || 'test',
        source: row ? 'db' : envConfigured ? 'env' : null,
      };
    });
  }

  async getMasked(provider: PaymentProviderId) {
    if (!PAYMENT_PROVIDERS.includes(provider)) {
      throw new BadRequestException(`Unknown provider: ${provider}`);
    }
    const row = await this.configRepository.findOne({ where: { provider } });
    const active = await this.resolveActiveOptional();
    const creds = row
      ? (JSON.parse(decryptSecret(row.credentialsEncrypted)) as Record<
          string,
          string
        >)
      : this.envCredentials(provider);

    if (!creds) {
      throw new NotFoundException(`Gateway ${provider} is not configured`);
    }

    return {
      provider,
      isActive: active?.provider === provider,
      mode: (row?.mode as GatewayMode) || this.envMode(provider) || 'test',
      source: row ? 'db' : 'env',
      credentials: this.maskCredentials(provider, creds),
      webhookSecretConfigured: Boolean(
        row?.webhookSecretEncrypted || this.envWebhookSecret(provider),
      ),
      webhookUrlHint: `/v1/payments/webhooks/${provider}`,
    };
  }

  async upsert(input: {
    provider: PaymentProviderId;
    mode: GatewayMode;
    credentials: Record<string, string>;
    webhookSecret?: string;
    activate?: boolean;
    updatedByUserId?: number;
  }) {
    this.assertCredentialShape(input.provider, input.credentials);

    let row = await this.configRepository.findOne({
      where: { provider: input.provider },
    });
    if (!row) {
      row = this.configRepository.create({
        provider: input.provider,
        isActive: false,
      });
    }

    row.mode = input.mode;
    row.credentialsEncrypted = encryptSecret(JSON.stringify(input.credentials));
    if (input.webhookSecret !== undefined) {
      row.webhookSecretEncrypted = input.webhookSecret
        ? encryptSecret(input.webhookSecret)
        : null;
    }
    row.updatedByUserId = input.updatedByUserId ?? null;
    await this.configRepository.save(row);

    await this.audit(input.updatedByUserId ?? null, 'upsert', input.provider, {
      mode: input.mode,
      activate: Boolean(input.activate),
    });

    if (input.activate) {
      await this.activate(input.provider, input.updatedByUserId);
    }

    return this.getMasked(input.provider);
  }

  async activate(provider: PaymentProviderId, updatedByUserId?: number) {
    const row = await this.configRepository.findOne({ where: { provider } });
    if (!row && !this.envHasCredentials(provider)) {
      throw new BadRequestException(
        `Configure ${provider} credentials before activating`,
      );
    }

    await this.configRepository
      .createQueryBuilder()
      .update(PaymentGatewayConfigEntity)
      .set({ isActive: false })
      .execute();

    if (row) {
      row.isActive = true;
      row.updatedByUserId = updatedByUserId ?? row.updatedByUserId;
      await this.configRepository.save(row);
    } else {
      // Activate via env-only: persist a row pointing at encrypted env snapshot
      const creds = this.envCredentials(provider);
      if (!creds) {
        throw new BadRequestException(`No credentials for ${provider}`);
      }
      const webhook = this.envWebhookSecret(provider);
      await this.configRepository.save(
        this.configRepository.create({
          provider,
          isActive: true,
          mode: this.envMode(provider) || 'test',
          credentialsEncrypted: encryptSecret(JSON.stringify(creds)),
          webhookSecretEncrypted: webhook ? encryptSecret(webhook) : null,
          updatedByUserId: updatedByUserId ?? null,
        }),
      );
    }

    await this.audit(updatedByUserId ?? null, 'activate', provider, {});

    return this.getMasked(provider);
  }

  async test(
    provider: PaymentProviderId,
    credentials?: Record<string, string>,
    mode?: GatewayMode,
    updatedByUserId?: number,
  ) {
    const resolved = credentials
      ? {
          provider,
          mode: mode || 'test',
          credentials: credentials as GatewayCredentials,
          webhookSecret: null as string | null,
          source: 'db' as const,
        }
      : await this.resolveProvider(provider);

    const adapter = this.registry.get(provider);
    const result = await adapter.testConnection(
      resolved.credentials,
      resolved.webhookSecret,
    );
    await this.audit(updatedByUserId ?? null, 'test', provider, {
      ok: result.ok,
    });
    return result;
  }

  async requireActive(): Promise<ResolvedGateway> {
    const active = await this.resolveActiveOptional();
    if (!active) {
      throw new ServiceUnavailableException({
        message: 'No payment gateway is active',
        code: 'PAYMENT_GATEWAY_INACTIVE',
      });
    }
    return active;
  }

  async resolveActiveOptional(): Promise<ResolvedGateway | null> {
    const row = await this.configRepository.findOne({
      where: { isActive: true },
    });
    if (row) {
      return {
        provider: row.provider as PaymentProviderId,
        mode: (row.mode as GatewayMode) || 'test',
        credentials: JSON.parse(
          decryptSecret(row.credentialsEncrypted),
        ) as GatewayCredentials,
        webhookSecret: row.webhookSecretEncrypted
          ? decryptSecret(row.webhookSecretEncrypted)
          : null,
        source: 'db',
      };
    }

    const fromEnv = (process.env.PAYMENT_GATEWAY || '').toLowerCase();
    if (PAYMENT_PROVIDERS.includes(fromEnv as PaymentProviderId)) {
      return this.resolveProvider(fromEnv as PaymentProviderId);
    }
    return null;
  }

  async resolveProvider(provider: PaymentProviderId): Promise<ResolvedGateway> {
    const row = await this.configRepository.findOne({ where: { provider } });
    if (row) {
      return {
        provider,
        mode: (row.mode as GatewayMode) || 'test',
        credentials: JSON.parse(
          decryptSecret(row.credentialsEncrypted),
        ) as GatewayCredentials,
        webhookSecret: row.webhookSecretEncrypted
          ? decryptSecret(row.webhookSecretEncrypted)
          : this.envWebhookSecret(provider),
        source: 'db',
      };
    }

    const creds = this.envCredentials(provider);
    if (!creds) {
      throw new NotFoundException(`Gateway ${provider} is not configured`);
    }
    return {
      provider,
      mode: this.envMode(provider) || 'test',
      credentials: creds,
      webhookSecret: this.envWebhookSecret(provider),
      source: 'env',
    };
  }

  private assertCredentialShape(
    provider: PaymentProviderId,
    credentials: Record<string, string>,
  ) {
    const required: Record<PaymentProviderId, string[]> = {
      razorpay: ['keyId', 'keySecret'],
      stripe: ['secretKey', 'publishableKey'],
      payu: ['merchantKey', 'merchantSalt'],
    };
    for (const key of required[provider]) {
      if (!credentials[key]?.trim()) {
        throw new BadRequestException(`Missing credential field: ${key}`);
      }
    }
  }

  private maskCredentials(
    provider: PaymentProviderId,
    creds: Record<string, string>,
  ) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(creds)) {
      out[k] = maskSecret(v);
    }
    if (provider === 'razorpay' && creds.keyId) {
      out.keyId = maskSecret(creds.keyId, 4);
    }
    return out;
  }

  private envHasCredentials(provider: PaymentProviderId): boolean {
    return Boolean(this.envCredentials(provider));
  }

  private envCredentials(
    provider: PaymentProviderId,
  ): GatewayCredentials | null {
    if (provider === 'razorpay') {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keyId && keySecret) return { keyId, keySecret };
    }
    if (provider === 'stripe') {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      if (secretKey && publishableKey) return { secretKey, publishableKey };
    }
    if (provider === 'payu') {
      const merchantKey = process.env.PAYU_MERCHANT_KEY;
      const merchantSalt = process.env.PAYU_MERCHANT_SALT;
      if (merchantKey && merchantSalt) return { merchantKey, merchantSalt };
    }
    return null;
  }

  private envWebhookSecret(provider: PaymentProviderId): string | null {
    if (provider === 'razorpay') {
      return process.env.RAZORPAY_WEBHOOK_SECRET || null;
    }
    if (provider === 'stripe') {
      return process.env.STRIPE_WEBHOOK_SECRET || null;
    }
    return null;
  }

  private envMode(provider: PaymentProviderId): GatewayMode | null {
    if (provider === 'payu') {
      const m = (process.env.PAYU_MODE || '').toUpperCase();
      if (m === 'LIVE') return 'live';
      if (m === 'TEST') return 'test';
    }
    const sk =
      provider === 'stripe'
        ? process.env.STRIPE_SECRET_KEY
        : provider === 'razorpay'
          ? process.env.RAZORPAY_KEY_ID
          : null;
    if (sk?.includes('live')) return 'live';
    if (sk?.includes('test')) return 'test';
    return null;
  }

  private async audit(
    userId: number | null,
    action: string,
    provider: PaymentProviderId,
    detail: Record<string, unknown>,
  ) {
    await this.auditRepository.save(
      this.auditRepository.create({
        userId,
        action,
        provider,
        detail: JSON.stringify(detail),
      }),
    );
  }
}
