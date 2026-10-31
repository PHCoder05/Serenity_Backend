import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService checkout (SOW online-only)', () => {
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
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((row) => {
        orders.push(row);
        return row;
      }),
    };

    const menuRepository = {
      find: jest.fn().mockResolvedValue([menuItem]),
      count: jest.fn().mockResolvedValue(0),
    };
    const lineItemRepository = {
      create: jest.fn((x) => x),
      save: jest.fn((rows) => rows),
      delete: jest.fn(),
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
      assertIntentUnused: jest.fn(),
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

    return { service, paymentsService };
  }

  const dto = {
    items: [{ itemId: 'bowl-1', quantity: 1 }],
    deliveryAddress: 'Serenity Café, Rajbaug (Takeaway)',
    fulfillmentType: 'takeaway' as const,
    paymentMethod: 'UPI' as const,
    paymentIntentId: 'pi-test',
  };

  it('should requires a signed-in account', async () => {
    const { service } = buildService();
    await expect(
      service.create(undefined, dto as any, 'key-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_REQUIRED' }),
    });
  });

  it('should rejects cash on delivery', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        1,
        { ...dto, paymentMethod: 'COD' } as any,
        'key-2',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
