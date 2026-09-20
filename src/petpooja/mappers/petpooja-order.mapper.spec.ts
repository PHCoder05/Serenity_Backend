import { MenuItemEntity } from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import {
  buildOrderDiscounts,
  buildPetpoojaSaveOrderPayload,
  canPushOrderToPetpooja,
  isStatusProgression,
  mapSerenityStatusFromPetpooja,
} from './petpooja-order.mapper';

describe('PetpoojaOrderMapper', () => {
  const menuItem = {
    id: 'golden-lentil-bowl-7778660',
    petpoojaItemId: '7778660',
    name: 'Golden Lentil Bowl',
    description: 'Turmeric rice, roasted squash, herbs, and lemon tahini.',
    shortLabel: 'Turmeric rice and lemon tahini',
    image: 'https://example.com/bowl.jpg',
    category: 'Bowls',
    basePrice: 420,
    moods: ['Relax'],
    variants: [
      { id: 'v-9001', label: 'Regular bowl', priceDelta: 0 },
      { id: 'v-9002', label: 'Hearty bowl', priceDelta: 90 },
    ],
    extras: [{ id: 'a-8001', label: 'Avocado slices', price: 70 }],
    isCustomizable: true,
    inStock: true,
  } as MenuItemEntity;

  it('should build a docs-compliant save_order payload', () => {
    const orderedAt = new Date('2026-06-28T14:30:00.000Z');
    const payload = buildPetpoojaSaveOrderPayload({
      restId: 'test-rest-id',
      orderId: 'order-123',
      customerName: 'Aarav Mehta',
      customerPhone: '9876543210',
      deliveryAddress: '12 Calm Street',
      paymentMethod: 'UPI',
      note: 'Less spice',
      callbackUrl: 'https://example.com/api/v1/petpooja/webhook/callback',
      items: [
        {
          menuItem,
          quantity: 2,
          unitPrice: 490,
          variantId: 'v-9002',
          extraIds: ['a-8001'],
        },
      ],
      subtotal: 980,
      gst: 24,
      total: 1004,
      orderedAt,
    });

    expect(payload.restID).toBe('test-rest-id');
    expect(payload.orderinfo).toMatchObject({
      OrderInfo: {
        Order: {
          details: {
            orderID: 'order-123',
            payment_type: 'ONLINE',
            order_type: 'H',
            advanced_order: 'N',
            total: '1004.00',
            tax_total: '24.00',
            discount_total: '0.00',
            callback_url:
              'https://example.com/api/v1/petpooja/webhook/callback',
            device_type: 'Web',
          },
        },
        Customer: {
          details: {
            name: 'Aarav Mehta',
            phone: '9876543210',
            address: '12 Calm Street',
          },
        },
      },
    });

    const orderItem = (payload.orderinfo as any).OrderInfo.OrderItem.details[0];
    expect(orderItem).toMatchObject({
      id: '7778660',
      quantity: '2',
      price: '490.00',
      final_price: '490.00',
      gst_liability: 'restaurant',
      variation_id: '9002',
      variation_name: 'Hearty bowl',
    });
    expect(orderItem.item_tax).toEqual([
      { id: '3661', name: 'CGST', tax_percentage: '2.5', amount: '24.50' },
      { id: '3662', name: 'SGST', tax_percentage: '2.5', amount: '24.50' },
    ]);
    expect(orderItem.addon_items[0]).toMatchObject({
      id: '8001',
      name: 'Avocado slices',
    });

    const orderTax = (payload.orderinfo as any).OrderInfo.Tax.details;
    expect(orderTax).toHaveLength(2);
    expect(orderTax[0]).toMatchObject({ title: 'CGST' });
    expect(orderTax[1]).toMatchObject({ title: 'SGST' });
  });

  it('should require petpoojaItemId on every line before pushing', () => {
    expect(
      canPushOrderToPetpooja([
        {
          menuItem,
          quantity: 1,
          unitPrice: 420,
        },
      ]),
    ).toBe(true);

    expect(
      canPushOrderToPetpooja([
        {
          menuItem: { ...menuItem, petpoojaItemId: null } as MenuItemEntity,
          quantity: 1,
          unitPrice: 420,
        },
      ]),
    ).toBe(false);
  });

  it('should map callback statuses to Serenity order statuses', () => {
    expect(mapSerenityStatusFromPetpooja('1')).toBe('accepted');
    expect(mapSerenityStatusFromPetpooja('-1')).toBe('cancelled');
    expect(mapSerenityStatusFromPetpooja('3')).toBe('preparing');
    expect(mapSerenityStatusFromPetpooja('4')).toBe('dispatched');
    expect(mapSerenityStatusFromPetpooja('5')).toBe('ready');
    expect(mapSerenityStatusFromPetpooja('10')).toBe('delivered');
    expect(mapSerenityStatusFromPetpooja('99')).toBeNull();
  });

  it('should only allow forward status progression except cancel', () => {
    expect(isStatusProgression('confirmed', 'accepted')).toBe(true);
    expect(isStatusProgression('preparing', 'ready')).toBe(true);
    expect(isStatusProgression('dispatched', 'accepted')).toBe(false);
    expect(isStatusProgression('delivered', 'cancelled')).toBe(true);
    expect(isStatusProgression('cancelled', 'accepted')).toBe(false);
  });

  it('should emit order-level Discount details for coupon and loyalty', () => {
    const payload = buildPetpoojaSaveOrderPayload({
      restId: 'test-rest-id',
      orderId: 'order-disc',
      customerName: 'Aarav',
      customerPhone: '9876543210',
      deliveryAddress: '12 Calm Street',
      paymentMethod: 'COD',
      items: [{ menuItem, quantity: 1, unitPrice: 420 }],
      subtotal: 420,
      gst: 21,
      total: 391,
      discounts: buildOrderDiscounts(
        { couponDiscount: -50, loyaltyDiscount: -20 },
        'SERENITY10',
      ),
      orderedAt: new Date('2026-06-28T14:30:00.000Z'),
    });

    const order = (payload.orderinfo as any).OrderInfo.Order.details;
    expect(order.discount_total).toBe('70.00');
    expect(order.discount_type).toBe('F');
    expect(order.total).toBe('391.00');
    expect(order.tax_total).toBe('21.00');

    const discountDetails = (payload.orderinfo as any).OrderInfo.Discount
      .details;
    expect(discountDetails).toEqual([
      {
        id: 'serenity-disc-1',
        title: 'Coupon SERENITY10',
        type: 'F',
        price: '50.00',
      },
      {
        id: 'serenity-disc-2',
        title: 'Loyalty points',
        type: 'F',
        price: '20.00',
      },
    ]);
  });
});
