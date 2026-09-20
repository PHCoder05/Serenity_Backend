import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import {
  CreateCheckoutResult,
  GatewayCredentials,
  PaymentGatewayAdapter,
  RazorpayCredentials,
  toPaise,
  WebhookParseResult,
} from './payment-gateway.types';

function asRazorpay(creds: GatewayCredentials): RazorpayCredentials {
  const c = creds as RazorpayCredentials;
  if (!c?.keyId || !c?.keySecret) {
    throw new Error('Invalid Razorpay credentials');
  }
  return c;
}

function client(creds: RazorpayCredentials) {
  return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export class RazorpayAdapter implements PaymentGatewayAdapter {
  readonly provider = 'razorpay' as const;

  async testConnection(creds: GatewayCredentials) {
    try {
      const rz = asRazorpay(creds);
      await client(rz).orders.create({
        amount: 100,
        currency: 'INR',
        receipt: `test-${Date.now()}`.slice(0, 40),
      });
      return { ok: true, message: 'Razorpay credentials accepted' };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.error?.description || err?.message || 'Connection failed',
      };
    }
  }

  async createCheckout(
    creds: GatewayCredentials,
    input: {
      intentId: string;
      amountInr: number;
      currency: string;
      method: 'UPI' | 'CARD';
    },
  ): Promise<CreateCheckoutResult> {
    const rz = asRazorpay(creds);
    const amountPaise = toPaise(input.amountInr);
    const order = await client(rz).orders.create({
      amount: amountPaise,
      currency: input.currency || 'INR',
      receipt: input.intentId.slice(0, 40),
      notes: { serenityIntentId: input.intentId },
    });

    return {
      externalOrderRef: order.id,
      clientAction: {
        type: 'razorpay_checkout',
        keyId: rz.keyId,
        orderId: order.id,
        amountPaise,
        currency: input.currency || 'INR',
      },
    };
  }

  async verifyClientConfirmation(
    creds: GatewayCredentials,
    input: { externalOrderRef: string; payload: Record<string, string> },
  ) {
    const rz = asRazorpay(creds);
    const paymentId =
      input.payload.razorpay_payment_id || input.payload.paymentId;
    const signature =
      input.payload.razorpay_signature || input.payload.signature;
    const orderId =
      input.payload.razorpay_order_id ||
      input.payload.orderId ||
      input.externalOrderRef;

    if (!paymentId || !signature || !orderId) {
      return 'failed';
    }

    const expected = createHmac('sha256', rz.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (!safeEqualHex(expected, signature)) {
      return 'failed';
    }

    // Signature proves authenticity; PSP fetch is source of capture status.
    const payment = await client(rz).payments.fetch(paymentId);
    if (payment.status === 'captured') return 'succeeded';
    if (payment.status === 'failed') return 'failed';
    return 'pending';
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- signature check is sync
  async parseWebhook(
    creds: GatewayCredentials,
    webhookSecret: string | null,
    input: {
      rawBody: Buffer | string;
      headers: Record<string, string | string[] | undefined>;
    },
  ): Promise<WebhookParseResult> {
    asRazorpay(creds);
    const raw =
      typeof input.rawBody === 'string'
        ? input.rawBody
        : input.rawBody.toString('utf8');
    const headerVal = input.headers['x-razorpay-signature'];
    const signature = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    if (!webhookSecret || !signature) {
      throw new Error('Missing Razorpay webhook signature or secret');
    }

    const expected = createHmac('sha256', webhookSecret)
      .update(raw)
      .digest('hex');
    if (!safeEqualHex(expected, signature)) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const event = JSON.parse(raw) as {
      id?: string;
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            error_description?: string;
          };
        };
      };
    };

    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const eventId =
      event.id ||
      `${event.event || 'evt'}:${payment?.id || orderId || 'unknown'}`;
    if (!orderId) {
      return {
        eventId,
        externalOrderRef: '',
        paymentRef: null,
        status: 'ignored',
      };
    }

    const amountInr =
      typeof payment?.amount === 'number' ? payment.amount / 100 : null;

    if (event.event === 'payment.captured') {
      return {
        eventId,
        externalOrderRef: orderId,
        paymentRef: payment?.id ?? null,
        status: 'succeeded',
        amountInr,
      };
    }
    if (event.event === 'payment.failed') {
      return {
        eventId,
        externalOrderRef: orderId,
        paymentRef: payment?.id ?? null,
        status: 'failed',
        amountInr,
        failureReason: payment?.error_description,
      };
    }

    return {
      eventId,
      externalOrderRef: orderId,
      paymentRef: payment?.id ?? null,
      status: 'ignored',
      amountInr,
    };
  }

  async refund(
    creds: GatewayCredentials,
    input: { paymentRef: string; amountInr: number; reason?: string },
  ) {
    const rz = asRazorpay(creds);
    const refund = await client(rz).payments.refund(input.paymentRef, {
      amount: toPaise(input.amountInr),
      notes: input.reason ? { reason: input.reason } : undefined,
    });
    return { refundRef: refund.id };
  }
}
