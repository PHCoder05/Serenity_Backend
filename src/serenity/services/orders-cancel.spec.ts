import { OrdersService } from './orders.service';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { MenuItemEntity } from '../infrastructure/persistence/relational/entities/menu-item.entity';
import { OrderLineItemEntity } from '../infrastructure/persistence/relational/entities/order-line-item.entity';
import { OrderStatusHistoryEntity } from '../infrastructure/persistence/relational/entities/order-status-history.entity';
import { SerenityOrderEntity } from '../infrastructure/persistence/relational/entities/serenity-order.entity';

describe('OrdersService.cancel', () => {
  function chain(affected: number) {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.update = self;
    builder.set = self;
    builder.where = self;
    builder.andWhere = self;
    builder.setParameter = self;
    builder.execute = jest.fn().mockResolvedValue({ affected });
    return builder;
  }

  function build(affected: number) {
    const order = {
      id: 'ord-1',
      userId: 2,
      status: 'confirmed',
      cancelReason: null,
      paymentIntentId: 'pi_1',
      orderedAt: new Date('2026-10-31T10:00:00Z'),
      itemSummary: 'Bowl',
      note: null,
      quantity: 1,
      total: 100,
      subtotal: 100,
      couponDiscount: 0,
      gst: 0,
      amountPaid: 100,
      paidVia: 'UPI',
      lineItems: [],
      loyaltyPointsRedeemed: 0,
      itemSummaryPoints: 0,
    } as unknown as SerenityOrderEntity;

    const claim = chain(affected);
    const stock = chain(1);
    const orderRepository = {
      findOne: jest.fn(async () => order),
      createQueryBuilder: jest.fn(() => claim),
    };
    const lineItemRepository = {
      find: jest.fn().mockResolvedValue([{ menuItemId: 'item-1', quantity: 1 }]),
    };
    const menuRepository = {
      createQueryBuilder: jest.fn(() => stock),
    };
    const loyaltyRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((row) => row),
      save: jest.fn(),
    };
    const historyRepository = {
      create: jest.fn((row) => row),
      save: jest.fn(),
    };
    const refundForOrderCancel = jest
      .fn()
      .mockResolvedValue({ refunded: true, refundRef: 'rf_1' });
    const cancelSerenityOrder = jest.fn();
    const dataSource = {
      transaction: jest.fn(async (work: (manager: unknown) => Promise<boolean>) =>
        work({
          getRepository: (entity: unknown) => {
            if (entity === SerenityOrderEntity) return orderRepository;
            if (entity === OrderLineItemEntity) return lineItemRepository;
            if (entity === MenuItemEntity) return menuRepository;
            if (entity === LoyaltyTransactionEntity) return loyaltyRepository;
            if (entity === OrderStatusHistoryEntity) return historyRepository;
            throw new Error('unexpected repository');
          },
        }),
      ),
    };

    const service = new OrdersService(
      menuRepository as never,
      orderRepository as never,
      lineItemRepository as never,
      loyaltyRepository as never,
      {} as never,
      historyRepository as never,
      { refundForOrderCancel } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
      { cancelSerenityOrder } as never,
    );

    return {
      service,
      order,
      claim,
      stock,
      orderRepository,
      historyRepository,
      refundForOrderCancel,
      cancelSerenityOrder,
      dataSource,
    };
  }

  it('should restores stock once and still refunds a retry', async () => {
    const ctx = build(1);

    const first = await ctx.service.cancel(2, 'ord-1', 'Changed my mind');
    const second = await ctx.service.cancel(2, 'ord-1');

    expect(first.status).toBe('cancelled');
    expect(second.status).toBe('cancelled');
    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(ctx.stock.execute).toHaveBeenCalledTimes(1);
    expect(ctx.historyRepository.save).toHaveBeenCalledTimes(1);
    expect(ctx.cancelSerenityOrder).toHaveBeenCalledTimes(1);
    expect(ctx.refundForOrderCancel).toHaveBeenCalledTimes(2);
    expect(ctx.refundForOrderCancel).toHaveBeenCalledWith({
      paymentIntentId: 'pi_1',
      reason: 'Changed my mind',
    });
  });

  it('should skips stock when the status claim loses', async () => {
    const ctx = build(0);
    ctx.orderRepository.findOne
      .mockResolvedValueOnce({
        ...ctx.order,
        status: 'confirmed',
      } as SerenityOrderEntity)
      .mockResolvedValueOnce({
        ...ctx.order,
        status: 'cancelled',
        cancelReason: 'Changed my mind',
      } as SerenityOrderEntity);

    const result = await ctx.service.cancel(2, 'ord-1');

    expect(result.status).toBe('cancelled');
    expect(ctx.stock.execute).not.toHaveBeenCalled();
    expect(ctx.cancelSerenityOrder).not.toHaveBeenCalled();
    expect(ctx.refundForOrderCancel).toHaveBeenCalledTimes(1);
  });
});
