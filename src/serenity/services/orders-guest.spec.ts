import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService guest checkout', () => {
  function buildService() {
    const menuItem = {
      id: 'bowl-1',
      name: 'Bowl',
      basePrice: 200,
      inStock: true,
      variants: null,
      extras: null,
      isCustomizable: false,
      ingredients: [],
    };

    const orders: any[] = [];
    const orderRepository = {
      findOne: jest.fn(({ where }: any) => {
        if (where.guestTokenHash) {
          return (
            orders.find((o) => o.guestTokenHash === where.guestTokenHash) ??
            null
          );
        }
        if (where.idempotencyKey) {
          return (
            orders.find(
              (o) =>
                o.userId === where.userId &&
                o.idempotencyKey === where.idempotencyKey,
            ) ?? null
          );
        }
        return orders.find((o) => o.id === where.id) ?? null;
      }),
      create: jest.fn((x) => x),
      save: jest.fn((row) => {
        orders.push({
          ...row,
          lineItems: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          kitchenSyncStatus: 'pending',
          cancelReason: null,
          foodRating: null,
          serviceRating: null,
          feedbackNote: null,
          feedbackAt: null,
          petpoojaOrderId: null,
        });
        return orders[orders.length - 1];
      }),
    };

    const menuRepository = {
      find: jest.fn().mockResolvedValue([menuItem]),
    };
    const lineItemRepository = {
      create: jest.fn((x) => x),
      save: jest.fn((rows) => rows),
    };
    const loyaltyRepository = {
      create: jest.fn((x) => x),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const storeRepository = {};
    const historyRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const paymentsService = {
      assertSucceededForOrder: jest.fn(),
    };
    const couponService = {
      apply: jest.fn().mockResolvedValue({
        code: null,
        discountInr: 0,
        label: null,
      }),
      redeem: jest.fn(),
    };
    const outletsService = {
      resolveOutletId: jest.fn().mockResolvedValue({ id: 'outlet-1' }),
      ensureStoreStatus: jest.fn().mockResolvedValue({ isOpen: true }),
    };
    const authService = {
      ensurePhoneUser: jest.fn().mockResolvedValue({ id: 77 }),
    };
    const configService = {
      get: jest.fn(),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'serenity.gstRate') return 0.05;
        return 0;
      }),
    };
    const loyaltySettings = {
      getRules: jest.fn().mockResolvedValue({
        pointValueInr: 1,
        maxRedeemPercent: 0.2,
        earnRate: 0.05,
        source: 'db',
      }),
    };

    const service = new OrdersService(
      menuRepository as any,
      orderRepository as any,
      lineItemRepository as any,
      loyaltyRepository as any,
      storeRepository as any,
      historyRepository as any,
      paymentsService as any,
      couponService as any,
      outletsService as any,
      authService as any,
      loyaltySettings as any,
      configService as any,
    );

    return { service, authService, orders, paymentsService };
  }

  const dto = {
    items: [{ itemId: 'bowl-1', quantity: 1 }],
    deliveryAddress: 'Koramangala',
    paymentMethod: 'COD' as const,
    guest: { name: 'Guest', phone: '9876543210' },
  };

  it('should requires guest contact without auth', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        undefined,
        {
          ...dto,
          guest: undefined,
        } as any,
        'key-1',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'GUEST_CONTACT_REQUIRED' }),
    });
  });

  it('should rejects non-COD guest checkout', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        undefined,
        { ...dto, paymentMethod: 'UPI' } as any,
        'key-2',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should creates guest COD order with guestToken', async () => {
    const { service, authService, orders } = buildService();
    const result = (await service.create(undefined, dto as any, 'key-3')) as {
      id: string;
      guestToken?: string;
    };
    expect(authService.ensurePhoneUser).toHaveBeenCalled();
    expect(result.guestToken).toHaveLength(48);
    expect(orders[0].isGuestCheckout).toBe(true);
    expect(orders[0].userId).toBe(77);

    const lookup = await service.findOneByGuestToken(result.guestToken!);
    expect(lookup.id).toBe(result.id);
  });
});
