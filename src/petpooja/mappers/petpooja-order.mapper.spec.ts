import { MenuItemEntity } from '../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import {
  buildPetpoojaSaveOrderPayload,
  canPushOrderToPetpooja,
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

  it('should build a save_order payload with customer and line items', () => {
    const orderedAt = new Date('2026-06-28T14:30:00.000Z');
    const payload = buildPetpoojaSaveOrderPayload({
      restId: 'test-rest-id',
      orderId: 'order-123',
      customerName: 'Aarav Mehta',
      customerPhone: '9876543210',
      deliveryAddress: '12 Calm Street',
      paymentMethod: 'UPI',
      note: 'Less spice',
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
      Order: {
        details: {
          orderID: 'order-123',
          clientOrderID: 'order-123',
          payment_type: 'ONLINE',
          order_type: 'H',
          total: '1004.00',
        },
        Customer: {
          name: 'Aarav Mehta',
          phone: '9876543210',
          address: '12 Calm Street',
        },
      },
    });

    const orderItem = (payload.orderinfo as any).Order.OrderItem[0];
    expect(orderItem).toMatchObject({
      id: '7778660',
      quantity: '2',
      price: '490.00',
    });
    expect(orderItem.variation[0]).toMatchObject({
      variationid: '9002',
      name: 'Hearty bowl',
    });
    expect(orderItem.addon[0]).toMatchObject({
      addonitemid: '8001',
      addonitem_name: 'Avocado slices',
    });
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
    expect(mapSerenityStatusFromPetpooja('4')).toBe('delivered');
  });
});
