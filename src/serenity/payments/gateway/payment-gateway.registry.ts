import { Injectable } from '@nestjs/common';
import { PayuAdapter } from './payu.adapter';
import { RazorpayAdapter } from './razorpay.adapter';
import { StripeAdapter } from './stripe.adapter';
import {
  PaymentGatewayAdapter,
  PaymentProviderId,
} from './payment-gateway.types';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly adapters: Record<PaymentProviderId, PaymentGatewayAdapter>;

  constructor() {
    this.adapters = {
      razorpay: new RazorpayAdapter(),
      stripe: new StripeAdapter(),
      payu: new PayuAdapter(),
    };
  }

  get(provider: PaymentProviderId): PaymentGatewayAdapter {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new Error(`Unknown payment provider: ${provider}`);
    }
    return adapter;
  }

  list(): PaymentProviderId[] {
    return Object.keys(this.adapters) as PaymentProviderId[];
  }
}
