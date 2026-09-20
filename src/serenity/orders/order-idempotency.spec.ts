import {
  clampLimit,
  clampPage,
  fingerprintCreateOrder,
  normalizeIdempotencyKey,
} from './order-idempotency';
import { CreateOrderDto } from '../dto/serenity.dto';

describe('order-idempotency helpers', () => {
  const baseDto = {
    items: [
      {
        itemId: 'bowl-1',
        quantity: 1,
        extraIds: ['b', 'a'],
      },
    ],
    deliveryAddress: '12 Serenity Lane',
    paymentMethod: 'COD' as const,
    couponCode: 'serenity10',
    note: '',
  } satisfies CreateOrderDto;

  it('should normalizes and clamps pagination', () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(3)).toBe(3);
    expect(clampLimit(100)).toBe(50);
    expect(clampLimit(undefined)).toBe(20);
  });

  it('should requires non-empty idempotency keys', () => {
    expect(normalizeIdempotencyKey('  ')).toBeNull();
    expect(normalizeIdempotencyKey('abc')).toBe('abc');
  });

  it('should fingerprints are stable regardless of extraIds order', () => {
    const a = fingerprintCreateOrder(baseDto);
    const b = fingerprintCreateOrder({
      ...baseDto,
      items: [
        {
          itemId: 'bowl-1',
          quantity: 1,
          extraIds: ['a', 'b'],
        },
      ],
    });
    expect(a).toBe(b);
  });

  it('should fingerprints differ when payload changes', () => {
    const a = fingerprintCreateOrder(baseDto);
    const b = fingerprintCreateOrder({
      ...baseDto,
      note: 'extra spicy',
    });
    expect(a).not.toBe(b);
  });
});
