import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventEntity } from '../infrastructure/persistence/relational/entities/event.entity';
import { EventBookingEntity } from '../infrastructure/persistence/relational/entities/event-booking.entity';

describe('EventsService', () => {
  function build(opts?: {
    event?: Partial<EventEntity>;
    bookings?: Partial<EventBookingEntity>[];
    payments?: { assertSucceededForOrder: jest.Mock };
  }) {
    const now = new Date();
    const event = {
      id: 'evt-1',
      title: 'Test',
      subtitle: 'Sub',
      description: 'Desc',
      dateLabel: 'Soon',
      location: 'BLR',
      audience: 'Public',
      status: 'registration-open',
      image: 'https://example.com/x.jpg',
      agenda: [],
      menuHighlights: [],
      hostName: 'Host',
      maxGuests: 10,
      depositAmountInr: 0,
      waitlistEnabled: true,
      registrationOpenAt: new Date(now.getTime() - 60_000),
      registrationCloseAt: null,
      createdAt: now,
      updatedAt: now,
      ...opts?.event,
    } as EventEntity;

    const bookings = (opts?.bookings ?? []).map(
      (row, i) =>
        ({
          id: `ebk-${i}`,
          eventId: event.id,
          userId: 1,
          bookingNumber: `BK-${i}`,
          status: 'confirmed',
          name: 'A',
          email: 'a@b.c',
          phone: '1',
          guestCount: 1,
          note: null,
          paymentIntentId: null,
          depositPaid: 0,
          createdAt: now,
          updatedAt: now,
          ...row,
        }) as EventBookingEntity,
    );

    const eventRepository = {
      find: jest.fn().mockResolvedValue([event]),
      findOne: jest.fn().mockResolvedValue(event),
      create: jest.fn((x) => x),
      save: jest.fn((x) => x),
    };

    const bookingRepository = {
      find: jest.fn(
        ({ where }: { where: { status?: string; userId?: number } }) =>
          bookings.filter((b) => {
            if (where.status && b.status !== where.status) return false;
            if (where.userId != null && b.userId !== where.userId) return false;
            return true;
          }),
      ),
      findOne: jest.fn(({ where }: { where: Record<string, unknown> }) => {
        return (
          bookings.find((b) => {
            if (where.id && b.id !== where.id) return false;
            if (where.eventId && b.eventId !== where.eventId) return false;
            if (
              where.paymentIntentId &&
              b.paymentIntentId !== where.paymentIntentId
            ) {
              return false;
            }
            return true;
          }) ?? null
        );
      }),
      create: jest.fn((x) => x),
      save: jest.fn((row: EventBookingEntity) => {
        const existing = bookings.find((b) => b.id === row.id);
        if (existing) {
          Object.assign(existing, row);
          return existing;
        }
        const created = {
          ...row,
          createdAt: row.createdAt ?? now,
          updatedAt: row.updatedAt ?? now,
        } as EventBookingEntity;
        bookings.push(created);
        return created;
      }),
    };

    const paymentsService = opts?.payments ?? {
      assertSucceededForOrder: jest.fn().mockResolvedValue({}),
    };

    const service = new EventsService(
      eventRepository as any,
      bookingRepository as any,
      paymentsService as any,
    );

    return {
      service,
      event,
      bookings,
      eventRepository,
      bookingRepository,
      paymentsService,
    };
  }

  const bookingDto = {
    name: 'Aarav',
    email: 'aarav@serenity.app',
    phone: '999',
    guestCount: 2,
  };

  it('should confirms booking when seats remain', async () => {
    const { service } = build({
      bookings: [{ status: 'confirmed', guestCount: 8 }],
    });
    const result = await service.createBooking(1, 'evt-1', bookingDto);
    expect(result.status).toBe('confirmed');
    expect(result.guestCount).toBe(2);
  });

  it('should waitlists when full and waitlist enabled', async () => {
    const { service } = build({
      bookings: [{ status: 'confirmed', guestCount: 10 }],
    });
    const result = await service.createBooking(1, 'evt-1', bookingDto);
    expect(result.status).toBe('waitlisted');
  });

  it('should rejects EVENT_FULL when waitlist disabled', async () => {
    const { service } = build({
      event: { waitlistEnabled: false },
      bookings: [{ status: 'confirmed', guestCount: 10 }],
    });
    await expect(
      service.createBooking(1, 'evt-1', bookingDto),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVENT_FULL' }),
    });
  });

  it('should requires succeeded payment intent when deposit > 0', async () => {
    const { service, paymentsService } = build({
      event: { depositAmountInr: 500 },
    });
    await expect(
      service.createBooking(1, 'evt-1', bookingDto),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVENT_DEPOSIT_REQUIRED' }),
    });

    const result = await service.createBooking(1, 'evt-1', {
      ...bookingDto,
      paymentIntentId: 'pi_1',
    });
    expect(paymentsService.assertSucceededForOrder).toHaveBeenCalledWith({
      userId: 1,
      paymentIntentId: 'pi_1',
      orderTotal: 500,
    });
    expect(result.depositPaid).toBe(500);
    expect(result.paymentIntentId).toBe('pi_1');
  });

  it('should rejects reused payment intent', async () => {
    const { service } = build({
      event: { depositAmountInr: 100 },
      bookings: [
        {
          id: 'ebk-old',
          status: 'confirmed',
          guestCount: 1,
          paymentIntentId: 'pi_used',
        },
      ],
    });
    await expect(
      service.createBooking(1, 'evt-1', {
        ...bookingDto,
        paymentIntentId: 'pi_used',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should cancels only owner booking', async () => {
    const { service, bookings } = build({
      bookings: [
        {
          id: 'ebk-1',
          userId: 9,
          status: 'confirmed',
          guestCount: 2,
        },
      ],
    });
    await expect(
      service.cancelBooking(1, 'evt-1', 'ebk-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    bookings[0].userId = 1;
    const cancelled = await service.cancelBooking(1, 'evt-1', 'ebk-1');
    expect(cancelled.status).toBe('cancelled');
  });

  it('should promotes waitlisted booking when seats free', async () => {
    const { service } = build({
      bookings: [
        {
          id: 'ebk-w',
          status: 'waitlisted',
          guestCount: 3,
        },
      ],
    });
    const result = await service.confirmWaitlistedBooking('evt-1', 'ebk-w');
    expect(result.status).toBe('confirmed');
  });

  it('should lists bookings for the signed-in user with event summary', async () => {
    const { service } = build({
      bookings: [
        { id: 'ebk-mine', userId: 7, bookingNumber: 'BK-7' },
        { id: 'ebk-other', userId: 2, bookingNumber: 'BK-2' },
      ],
    });
    const result = await service.listMyBookings(7);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].bookingNumber).toBe('BK-7');
    expect(result.data[0].event?.id).toBe('evt-1');
  });

  it('should computes availability excluding cancelled', async () => {
    const { service, event } = build({
      bookings: [
        { status: 'confirmed', guestCount: 4 },
        { status: 'cancelled', guestCount: 4 },
        { status: 'waitlisted', guestCount: 2 },
      ],
    });
    const availability = await service.computeAvailability(event);
    expect(availability.confirmedGuests).toBe(4);
    expect(availability.remainingSeats).toBe(6);
    expect(availability.waitlistCount).toBe(1);
  });
});
