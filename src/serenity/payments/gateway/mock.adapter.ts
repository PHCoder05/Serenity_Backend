import {
  CreateCheckoutResult,
  GatewayCredentials,
  PaymentGatewayAdapter,
  WebhookParseResult,
} from './payment-gateway.types';

type MockCredentials = {
  token?: string;
};

function asMock(creds: GatewayCredentials): MockCredentials {
  return (creds || {}) as MockCredentials;
}

/**
 * Local/dev adapter — never calls a real PSP. Activate with PAYMENT_GATEWAY=mock
 * or upsert+activate provider "mock" in admin. Must not be used in production.
 */
export class MockPaymentAdapter implements PaymentGatewayAdapter {
  readonly provider = 'mock' as const;

  async testConnection(creds: GatewayCredentials) {
    asMock(creds);
    return { ok: true, message: 'Mock gateway ready (dev only)' };
  }

  async createCheckout(
    _creds: GatewayCredentials,
    input: {
      intentId: string;
      amountInr: number;
      currency: string;
      method: 'UPI' | 'CARD';
    },
  ): Promise<CreateCheckoutResult> {
    const externalOrderRef = `mock_order_${input.intentId}`;
    return {
      externalOrderRef,
      clientAction: {
        type: 'mock_checkout',
        mockOrderId: externalOrderRef,
        amountInr: input.amountInr,
        currency: input.currency || 'INR',
      },
    };
  }

  async verifyClientConfirmation(
    _creds: GatewayCredentials,
    input: {
      externalOrderRef: string;
      payload: Record<string, string>;
    },
  ): Promise<'succeeded' | 'failed' | 'pending'> {
    if (input.payload?.forceFail === '1') {
      return 'failed';
    }
    return 'succeeded';
  }

  async parseWebhook(
    _creds: GatewayCredentials,
    _webhookSecret: string | null,
    input: {
      rawBody: Buffer | string;
      headers: Record<string, string | string[] | undefined>;
      parsedBody?: unknown;
    },
  ): Promise<WebhookParseResult> {
    const body =
      (input.parsedBody as Record<string, unknown>) ||
      (typeof input.rawBody === 'string'
        ? JSON.parse(input.rawBody || '{}')
        : JSON.parse(input.rawBody.toString('utf8') || '{}'));

    const externalOrderRef = String(
      body.externalOrderRef || body.orderId || '',
    );
    const statusRaw = String(body.status || 'succeeded');
    const status =
      statusRaw === 'failed'
        ? 'failed'
        : statusRaw === 'ignored'
          ? 'ignored'
          : 'succeeded';

    return {
      eventId: String(body.eventId || `mock_evt_${Date.now()}`),
      externalOrderRef,
      paymentRef: String(body.paymentRef || `mock_pay_${Date.now()}`),
      status,
      amountInr:
        typeof body.amountInr === 'number' ? body.amountInr : undefined,
      failureReason:
        status === 'failed' ? String(body.failureReason || 'mock fail') : undefined,
    };
  }

  async refund(
    _creds: GatewayCredentials,
    input: {
      paymentRef: string;
      amountInr: number;
      reason?: string;
    },
  ) {
    return { refundRef: `mock_rfnd_${input.paymentRef}` };
  }
}
