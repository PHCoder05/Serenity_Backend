import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEntity } from '../infrastructure/persistence/relational/entities/event.entity';
import { EventBookingEntity } from '../infrastructure/persistence/relational/entities/event-booking.entity';
import {
  CreateEventBookingDto,
  CreateEventDto,
  UpdateEventAdminDto,
} from '../dto/serenity.dto';
import { PaymentsService } from './payments.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(EventBookingEntity)
    private readonly bookingRepository: Repository<EventBookingEntity>,
    private readonly paymentsService: PaymentsService,
  ) {}

  async findAll(query: { audience?: string; status?: string; q?: string }) {
    const events = await this.eventRepository.find({
      order: { createdAt: 'DESC' },
    });

    const filtered = events.filter((event) => {
      if (query.audience && event.audience !== query.audience) return false;
      if (query.status && event.status !== query.status) return false;
      if (query.q) {
        const q = query.q.toLowerCase();
        const haystack = [event.title, event.subtitle, event.description]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return {
      data: filtered.map((event) => this.toSummary(event)),
      hasNextPage: false,
    };
  }

  async findOne(id: string) {
    const event = await this.requireEvent(id);
    const availability = await this.computeAvailability(event);
    return this.toDetail(event, availability);
  }

  async getAvailability(id: string) {
    const event = await this.requireEvent(id);
    return this.computeAvailability(event);
  }

  async listMyBookings(userId: number) {
    const bookings = await this.bookingRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const eventIds = [...new Set(bookings.map((booking) => booking.eventId))];
    const events = eventIds.length
      ? await this.eventRepository.find({ where: { id: In(eventIds) } })
      : [];
    const eventById = new Map(events.map((event) => [event.id, event]));

    return {
      data: bookings.map((booking) => ({
        ...this.toBookingDto(booking),
        event: eventById.has(booking.eventId)
          ? this.toSummary(eventById.get(booking.eventId)!)
          : null,
      })),
    };
  }

  async create(userId: number, dto: CreateEventDto) {
    const now = new Date();
    const event = await this.eventRepository.save(
      this.eventRepository.create({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        dateLabel: dto.dateLabel,
        location: dto.location,
        audience: dto.audience,
        status: 'planned',
        image:
          dto.image ??
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        agenda: dto.agenda ?? [],
        menuHighlights: dto.menuHighlights ?? [],
        hostName: `Host ${userId}`,
        maxGuests: dto.maxGuests ?? 100,
        depositAmountInr: dto.depositAmountInr ?? 0,
        waitlistEnabled: dto.waitlistEnabled ?? true,
        registrationOpenAt: now,
        registrationCloseAt: null,
      }),
    );

    const availability = await this.computeAvailability(event);
    return this.toDetail(event, availability);
  }

  async createBooking(
    userId: number,
    eventId: string,
    dto: CreateEventBookingDto,
  ) {
    const event = await this.requireEvent(eventId);
    this.assertRegistrationOpen(event);

    const depositRequired = event.depositAmountInr ?? 0;
    let depositPaid = 0;
    let paymentIntentId: string | null = null;

    if (depositRequired > 0) {
      if (!dto.paymentIntentId) {
        throw new BadRequestException({
          message: 'paymentIntentId is required for this event deposit',
          code: 'EVENT_DEPOSIT_REQUIRED',
        });
      }
      const reused = await this.bookingRepository.findOne({
        where: { paymentIntentId: dto.paymentIntentId },
      });
      if (reused) {
        throw new BadRequestException({
          message: 'Payment intent already used for a booking',
          code: 'EVENT_PAYMENT_INTENT_REUSED',
        });
      }
      await this.paymentsService.assertSucceededForOrder({
        userId,
        paymentIntentId: dto.paymentIntentId,
        orderTotal: depositRequired,
      });
      depositPaid = depositRequired;
      paymentIntentId = dto.paymentIntentId;
    }

    const { remainingSeats } = await this.computeAvailability(event);
    let status: 'confirmed' | 'waitlisted';
    if (dto.guestCount <= remainingSeats) {
      status = 'confirmed';
    } else if (event.waitlistEnabled) {
      status = 'waitlisted';
    } else {
      throw new BadRequestException({
        message: 'Event is full',
        code: 'EVENT_FULL',
      });
    }

    const booking = await this.bookingRepository.save(
      this.bookingRepository.create({
        id: `ebk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventId,
        userId,
        bookingNumber: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        status,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        guestCount: dto.guestCount,
        note: dto.note ?? null,
        paymentIntentId,
        depositPaid,
      }),
    );

    return this.toBookingDto(booking);
  }

  async cancelBooking(userId: number, eventId: string, bookingId: string) {
    const booking = await this.requireBooking(eventId, bookingId);
    if (booking.userId !== userId) {
      throw new ForbiddenException({
        message: 'Not your booking',
        code: 'EVENT_BOOKING_FORBIDDEN',
      });
    }
    if (booking.status === 'cancelled') {
      return this.toBookingDto(booking);
    }
    booking.status = 'cancelled';
    await this.bookingRepository.save(booking);
    return this.toBookingDto(booking);
  }

  async adminList() {
    const events = await this.eventRepository.find({
      order: { createdAt: 'DESC' },
    });
    const data = await Promise.all(
      events.map(async (event) => {
        const availability = await this.computeAvailability(event);
        return this.toDetail(event, availability);
      }),
    );
    return { data };
  }

  async adminUpdate(eventId: string, dto: UpdateEventAdminDto) {
    const event = await this.requireEvent(eventId);
    if (dto.title !== undefined) event.title = dto.title;
    if (dto.subtitle !== undefined) event.subtitle = dto.subtitle;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.status !== undefined) event.status = dto.status;
    if (dto.maxGuests !== undefined) event.maxGuests = dto.maxGuests;
    if (dto.depositAmountInr !== undefined) {
      event.depositAmountInr = dto.depositAmountInr;
    }
    if (dto.waitlistEnabled !== undefined) {
      event.waitlistEnabled = dto.waitlistEnabled;
    }
    if (dto.registrationOpenAt !== undefined) {
      event.registrationOpenAt = dto.registrationOpenAt
        ? new Date(dto.registrationOpenAt)
        : null;
    }
    if (dto.registrationCloseAt !== undefined) {
      event.registrationCloseAt = dto.registrationCloseAt
        ? new Date(dto.registrationCloseAt)
        : null;
    }
    await this.eventRepository.save(event);
    const availability = await this.computeAvailability(event);
    return this.toDetail(event, availability);
  }

  async adminListBookings(eventId: string) {
    await this.requireEvent(eventId);
    const bookings = await this.bookingRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
    return {
      data: bookings.map((booking) => ({
        ...this.toBookingDto(booking),
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        userId: booking.userId,
        note: booking.note,
      })),
    };
  }

  async confirmWaitlistedBooking(eventId: string, bookingId: string) {
    const event = await this.requireEvent(eventId);
    const booking = await this.requireBooking(eventId, bookingId);

    if (booking.status === 'confirmed') {
      return this.toBookingDto(booking);
    }
    if (booking.status !== 'waitlisted') {
      throw new BadRequestException({
        message: `Booking status is ${booking.status}; expected waitlisted`,
        code: 'EVENT_BOOKING_NOT_WAITLISTED',
      });
    }

    const { remainingSeats } = await this.computeAvailability(event);
    if (booking.guestCount > remainingSeats) {
      throw new BadRequestException({
        message: 'Not enough seats to confirm waitlisted booking',
        code: 'EVENT_FULL',
      });
    }

    booking.status = 'confirmed';
    await this.bookingRepository.save(booking);
    return this.toBookingDto(booking);
  }

  private async requireEvent(id: string) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async requireBooking(eventId: string, bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, eventId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private assertRegistrationOpen(event: EventEntity) {
    const now = Date.now();
    if (event.registrationOpenAt && event.registrationOpenAt.getTime() > now) {
      throw new BadRequestException({
        message: 'Registration is not open yet',
        code: 'EVENT_REGISTRATION_CLOSED',
      });
    }
    if (
      event.registrationCloseAt &&
      event.registrationCloseAt.getTime() < now
    ) {
      throw new BadRequestException({
        message: 'Registration is closed',
        code: 'EVENT_REGISTRATION_CLOSED',
      });
    }
  }

  async computeAvailability(event: EventEntity) {
    const confirmed = await this.bookingRepository.find({
      where: { eventId: event.id, status: 'confirmed' },
    });
    const waitlisted = await this.bookingRepository.find({
      where: { eventId: event.id, status: 'waitlisted' },
    });
    const confirmedGuests = confirmed.reduce(
      (sum, row) => sum + row.guestCount,
      0,
    );
    const remainingSeats = Math.max(0, event.maxGuests - confirmedGuests);
    return {
      eventId: event.id,
      maxGuests: event.maxGuests,
      confirmedGuests,
      remainingSeats,
      waitlistCount: waitlisted.length,
      waitlistEnabled: event.waitlistEnabled,
      depositAmountInr: event.depositAmountInr ?? 0,
    };
  }

  private toBookingDto(booking: EventBookingEntity) {
    return {
      id: booking.id,
      eventId: booking.eventId,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      guestCount: booking.guestCount,
      depositPaid: booking.depositPaid ?? 0,
      paymentIntentId: booking.paymentIntentId ?? null,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  private toSummary(event: EventEntity) {
    return {
      id: event.id,
      title: event.title,
      subtitle: event.subtitle,
      dateLabel: event.dateLabel,
      location: event.location,
      audience: event.audience,
      status: event.status,
      image: event.image,
      depositAmountInr: event.depositAmountInr ?? 0,
    };
  }

  private toDetail(
    event: EventEntity,
    availability: Awaited<ReturnType<EventsService['computeAvailability']>>,
  ) {
    return {
      ...this.toSummary(event),
      description: event.description,
      agenda: event.agenda,
      menuHighlights: event.menuHighlights,
      hostName: event.hostName,
      maxGuests: event.maxGuests,
      waitlistEnabled: event.waitlistEnabled,
      remainingSeats: availability.remainingSeats,
      waitlistCount: availability.waitlistCount,
      registrationOpenAt: event.registrationOpenAt?.toISOString() ?? '',
      registrationCloseAt: event.registrationCloseAt?.toISOString() ?? '',
    };
  }
}
