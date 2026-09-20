import { createHmac } from 'crypto';
import { payuHashTest } from './payu.adapter';
import { toPaise, toPayuAmount } from './payment-gateway.types';
import { maskSecret } from '../crypto/credentials-crypto';

describe('payment gateway helpers', () => {
  it('should converts INR to paise', () => {
    expect(toPaise(199)).toBe(19900);
    expect(toPaise(10.5)).toBe(1050);
  });

  it('should formats PayU amount with two decimals', () => {
    expect(toPayuAmount(199)).toBe('199.00');
  });

  it('should masks secrets', () => {
    expect(maskSecret('rzp_test_abcdefgh')).toMatch(/^rzp_/);
    expect(maskSecret('secret')).toContain('*');
  });
});

describe('PayU hash', () => {
  it('should builds deterministic payment hash', () => {
    const hash = payuHashTest.buildPaymentHash(
      'key',
      'salt',
      'txn1',
      '100.00',
      'Serenity order',
      'Pat',
      'a@b.com',
    );
    expect(hash).toHaveLength(128);
    expect(hash).toBe(
      payuHashTest.buildPaymentHash(
        'key',
        'salt',
        'txn1',
        '100.00',
        'Serenity order',
        'Pat',
        'a@b.com',
      ),
    );
  });

  it('should verifies reverse hash for success callback', () => {
    const hash = payuHashTest.buildReverseHash(
      'salty',
      'success',
      'a@b.com',
      'Pat',
      'Serenity order',
      '100.00',
      'txn1',
      'merchant',
    );
    expect(hash).toHaveLength(128);
    expect(
      payuHashTest.buildReverseHash(
        'salty',
        'success',
        'a@b.com',
        'Pat',
        'Serenity order',
        '100.00',
        'txn1',
        'merchant',
      ),
    ).toBe(hash);
  });
});

describe('Razorpay signature shape', () => {
  it('should matches HMAC order_id|payment_id', () => {
    const secret = 'test_secret';
    const orderId = 'order_1';
    const paymentId = 'pay_1';
    const expected = createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    expect(expected).toHaveLength(64);
  });
});
