import { toOrderDetailDto, toOrderListItemDto } from './mappers';
import { SerenityOrderEntity } from './infrastructure/persistence/relational/entities/serenity-order.entity';

function buildOrder(
  overrides: Partial<SerenityOrderEntity> = {},
): SerenityOrderEntity {
  return {
    id: 'order-1',
    userId: 1,
    status: 'preparing',
    petpoojaOrderId: null,
    idempotencyKey: null,
    kitchenSyncStatus: 'submitted',
    cancelReason: null,
    foodRating: null,
    serviceRating: null,
    feedbackNote: null,
    feedbackAt: null,
    orderedAt: new Date('2026-01-01T10:00:00.000Z'),
    itemSummary: 'Bowl x 1',
    note: '',
    total: 320,
    quantity: 1,
    subtotal: 300,
    couponDiscount: 0,
    gst: 20,
    amountPaid: 320,
    paidVia: 'UPI',
    lineItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SerenityOrderEntity;
}

describe('serenity.mapper lifecycle projection', () => {
  it('should map active lifecycle labels for list and detail views', () => {
    const order = buildOrder({ status: 'preparing' });

    const list = toOrderListItemDto(order);
    const detail = toOrderDetailDto(order);

    expect(list.statusLabel).toBe('Preparing');
    expect(
      detail.lifecycle?.timeline.find((step) => step.key === 'preparing')
        ?.current,
    ).toBe(true);
  });

  it('should render cancel reason in lifecycle label', () => {
    const order = buildOrder({
      status: 'cancelled',
      cancelReason: 'Kitchen unavailable',
    });
    const detail = toOrderDetailDto(order);
    expect(detail.statusLabel).toContain('Kitchen unavailable');
  });
});
