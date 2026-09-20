export type PaymentProviderId = 'razorpay' | 'stripe' | 'payu';

export const PAYMENT_PROVIDERS: PaymentProviderId[] = [
  'razorpay',
  'stripe',
  'payu',
];

export type GatewayMode = 'test' | 'live';

export type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
};

export type StripeCredentials = {
  secretKey: string;
  publishableKey: string;
};

export type PayuCredentials = {
  merchantKey: string;
  merchantSalt: string;
};

export type GatewayCredentials =
  | RazorpayCredentials
  | StripeCredentials
  | PayuCredentials;

export type ClientAction =
  | {
      type: 'razorpay_checkout';
      keyId: string;
      orderId: string;
      amountPaise: number;
      currency: string;
    }
  | {
      type: 'stripe_payment_sheet';
      publishableKey: string;
      clientSecret: string;
      paymentIntentId: string;
    }
  | {
      type: 'payu_webview';
      actionUrl: string;
      params: Record<string, string>;
      txnid: string;
    };

export type CreateCheckoutResult = {
  externalOrderRef: string;
  clientAction: ClientAction;
};

export type WebhookParseResult = {
  eventId: string;
  externalOrderRef: string;
  paymentRef: string | null;
  status: 'succeeded' | 'failed' | 'ignored';
  amountInr?: number | null;
  failureReason?: string;
};

export interface PaymentGatewayAdapter {
  readonly provider: PaymentProviderId;

  testConnection(
    creds: GatewayCredentials,
    webhookSecret?: string | null,
  ): Promise<{ ok: boolean; message?: string }>;

  createCheckout(
    creds: GatewayCredentials,
    input: {
      intentId: string;
      amountInr: number;
      currency: string;
      method: 'UPI' | 'CARD';
      mode: GatewayMode;
      metadata?: Record<string, string>;
    },
  ): Promise<CreateCheckoutResult>;

  verifyClientConfirmation(
    creds: GatewayCredentials,
    input: {
      externalOrderRef: string;
      payload: Record<string, string>;
    },
  ): Promise<'succeeded' | 'failed' | 'pending'>;

  parseWebhook(
    creds: GatewayCredentials,
    webhookSecret: string | null,
    input: {
      rawBody: Buffer | string;
      headers: Record<string, string | string[] | undefined>;
      parsedBody?: unknown;
    },
  ): Promise<WebhookParseResult>;

  refund(
    creds: GatewayCredentials,
    input: {
      paymentRef: string;
      amountInr: number;
      reason?: string;
      mode?: GatewayMode;
    },
  ): Promise<{ refundRef: string }>;
}

export function toPaise(amountInr: number): number {
  return Math.round(amountInr * 100);
}

export function toPayuAmount(amountInr: number): string {
  return amountInr.toFixed(2);
}
