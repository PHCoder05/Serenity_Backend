import { BadRequestException } from '@nestjs/common';
import { SupportService } from './support.service';

describe('SupportService', () => {
  it('should rejects short queries', async () => {
    const service = new SupportService({} as any, {} as any, {} as any, {} as any);
    await expect(service.searchCustomers('a')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should searches customers by email', async () => {
    const userRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: 'aarav@serenity.app',
          firstName: 'Aarav',
          lastName: 'Menon',
          provider: 'email',
        },
      ]),
      findOne: jest.fn(),
    };
    const profileRepository = {
      find: jest.fn().mockResolvedValue([{ userId: 1, phone: '9876543210' }]),
    };
    const service = new SupportService(
      userRepository as any,
      profileRepository as any,
      {} as any,
      {} as any,
    );

    const result = await service.searchCustomers('aarav@');
    expect(result.data[0].email).toBe('aarav@serenity.app');
    expect(result.data[0].phone).toBe('9876543210');
  });

  it('should collects cash and marks served', async () => {
    const order = {
      id: 'order-1',
      status: 'confirmed',
      total: 513,
      amountPaid: 0,
      paidVia: 'COD',
      userId: null,
      guestPhone: '9655555555',
      isGuestCheckout: true,
      itemSummary: 'Bowl x 1',
      note: '',
      quantity: 1,
      orderedAt: new Date('2026-10-03T10:00:00Z'),
      kitchenSyncStatus: 'skipped',
    };
    const orderRepository = {
      findOne: jest.fn().mockResolvedValue(order),
      save: jest.fn(async (row) => row),
    };
    const historyRepository = {
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => row),
    };
    const service = new SupportService(
      {} as any,
      {} as any,
      orderRepository as any,
      historyRepository as any,
    );

    const collected = await service.collectPayment('order-1');
    expect(collected.amountPaid).toBe(513);
    const served = await service.markServed('order-1');
    expect(served.status).toBe('delivered');
    expect(historyRepository.save).toHaveBeenCalled();
  });
});
