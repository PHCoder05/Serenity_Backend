import Stripe from 'stripe';
import {
  CreateCheckoutResult,
  GatewayCredentials,
  PaymentGatewayAdapter,
  StripeCredentials,
  toPaise,
  WebhookParseResult,
} from './payment-gateway.types';

function asStripe(creds: GatewayCredentials): StripeCredentials {
  const c = creds as StripeCredentials;
  if (!c?.secretKey || !c?.publishableKey) {
    throw new Error('Invalid Stripe credentials');
  }
  return c;
}

function client(creds: StripeCredentials) {
  return new Stripe(creds.secretKey);
}

export class StripeAdapter implements PaymentGatewayAdapter {
  readonly provider = 'stripe' as const;

  async testConnection(creds: GatewayCredentials) {
    try {
      const st = asStripe(creds);
      await client(st).balance.retrieve();
      return { ok: true, message: 'Stripe credentials accepted' };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || 'Connection failed',
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
    const st = asStripe(creds);
    const pi = await client(st).paymentIntents.create({
      amount: toPaise(input.amountInr),
      currency: (input.currency || 'INR').toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { serenityIntentId: input.intentId },
    });

    if (!pi.client_secret) {
      throw new Error('Stripe PaymentIntent missing client_secret');
    }

    return {
      externalOrderRef: pi.id,
      clientAction: {
        type: 'stripe_payment_sheet',
        publishableKey: st.publishableKey,
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      },
    };
  }

  async verifyClientConfirmation(
    creds: GatewayCredentials,
    input: { externalOrderRef: string; payload: Record<string, string> },
  ) {
    const st = asStripe(creds);
    const piId = input.payload.paymentIntentId || input.externalOrderRef;
    const pi = await client(st).paymentIntents.retrieve(piId);

    if (pi.status === 'succeeded') return 'succeeded';
    if (pi.status === 'canceled' || pi.status === 'requires_payment_method') {
      return 'failed';
    }
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
    const st = asStripe(creds);
    const headerVal = input.headers['stripe-signature'];
    const signature = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    if (!webhookSecret || !signature) {
      throw new Error('Missing Stripe webhook signature or secret');
    }

    const raw =
      typeof input.rawBody === 'string' ? input.rawBody : input.rawBody;
    const event = client(st).webhooks.constructEvent(
      raw,
      signature,
      webhookSecret,
    );

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        eventId: event.id,
        externalOrderRef: pi.id,
        paymentRef:
          typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.id,
        status: 'succeeded',
        amountInr: pi.amount / 100,
      };
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        eventId: event.id,
        externalOrderRef: pi.id,
        paymentRef:
          typeof pi.latest_charge === 'string' ? pi.latest_charge : null,
        status: 'failed',
        amountInr: pi.amount / 100,
        failureReason: pi.last_payment_error?.message,
      };
    }

    return {
      eventId: event.id,
      externalOrderRef: '',
      paymentRef: null,
      status: 'ignored',
    };
  }

  async refund(
    creds: GatewayCredentials,
    input: { paymentRef: string; amountInr: number; reason?: string },
  ) {
    const st = asStripe(creds);
    const params: Stripe.RefundCreateParams = {
      amount: toPaise(input.amountInr),
      reason: 'requested_by_customer',
    };
    if (input.paymentRef.startsWith('pi_')) {
      params.payment_intent = input.paymentRef;
    } else {
      params.charge = input.paymentRef;
    }
    const refund = await client(st).refunds.create(params);
    return { refundRef: refund.id };
  }
}
