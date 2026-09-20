import { PetpoojaSerenityOrderService } from './petpooja-serenity-order.service';

describe('PetpoojaSerenityOrderService.applyOrderCallback', () => {
  function setup() {
    const order = {
      id: 'order-client-1',
      status: 'confirmed',
      petpoojaOrderId: null as string | null,
      cancelReason: null as string | null,
    };

    const orderRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const storeRepository = {};
    const historyRepository = {
      create: jest.fn((row) => row),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const petpoojaRepository = {
      findOrderByExternalId: jest.fn(),
    };

    const outletRepository = {
      findOne: jest.fn(),
    };

    const service = new PetpoojaSerenityOrderService(
      orderRepository as any,
      storeRepository as any,
      historyRepository as any,
      outletRepository as any,
      petpoojaRepository as any,
    );

    return {
      service,
      order,
      orderRepository,
      historyRepository,
      petpoojaRepository,
    };
  }

  it('should resolves by Serenity id when POS id missing', async () => {
    const ctx = setup();
    ctx.orderRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ctx.order);

    const ok = await ctx.service.applyOrderCallback({
      restID: 'r1',
      orderID: 'order-client-1',
      status: '1',
    });

    expect(ok).toBe(true);
    expect(ctx.orderRepository.update).toHaveBeenCalledWith(
      'order-client-1',
      expect.objectContaining({
        status: 'accepted',
        kitchenSyncStatus: 'synced',
      }),
    );
    expect(ctx.historyRepository.save).toHaveBeenCalled();
  });

  it('should resolves via petpooja clientOrderId bridge', async () => {
    const ctx = setup();
    ctx.orderRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ctx.order);
    ctx.petpoojaRepository.findOrderByExternalId.mockResolvedValue({
      orderId: 'pos-empty-or-temp',
      clientOrderId: 'order-client-1',
    });

    const ok = await ctx.service.applyOrderCallback({
      restID: 'r1',
      orderID: 'pos-empty-or-temp',
      status: '2',
    });

    expect(ok).toBe(true);
    expect(ctx.petpoojaRepository.findOrderByExternalId).toHaveBeenCalledWith(
      'pos-empty-or-temp',
    );
    expect(ctx.orderRepository.update).toHaveBeenCalledWith(
      'order-client-1',
      expect.objectContaining({ status: 'preparing' }),
    );
  });

  it('should ignores regressive status updates', async () => {
    const ctx = setup();
    ctx.order.status = 'dispatched';
    ctx.orderRepository.findOne.mockResolvedValueOnce(ctx.order);

    const ok = await ctx.service.applyOrderCallback({
      restID: 'r1',
      orderID: 'order-client-1',
      status: '1',
    });

    expect(ok).toBe(true);
    expect(ctx.orderRepository.update).not.toHaveBeenCalled();
    expect(ctx.historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'ignored_regress' }),
    );
  });

  it('should still stores rider on regressive status callback', async () => {
    const ctx = setup();
    ctx.order.status = 'dispatched';
    ctx.orderRepository.findOne.mockResolvedValueOnce(ctx.order);

    await ctx.service.applyOrderCallback({
      restID: 'r1',
      orderID: 'order-client-1',
      status: '1',
      rider_name: 'Ravi',
      rider_phone_number: '9876543210',
    });

    expect(ctx.orderRepository.update).toHaveBeenCalledWith('order-client-1', {
      riderName: 'Ravi',
      riderPhone: '9876543210',
    });
  });

  it('should attaches rider when status progresses to dispatched', async () => {
    const ctx = setup();
    ctx.order.status = 'ready';
    ctx.orderRepository.findOne.mockResolvedValueOnce(ctx.order);

    await ctx.service.applyOrderCallback({
      restID: 'r1',
      orderID: 'order-client-1',
      status: '4',
      rider_name: 'Ravi',
      rider_phone_number: '9876543210',
    });

    expect(ctx.orderRepository.update).toHaveBeenCalledWith(
      'order-client-1',
      expect.objectContaining({
        status: 'dispatched',
        riderName: 'Ravi',
        riderPhone: '9876543210',
      }),
    );
  });
});
