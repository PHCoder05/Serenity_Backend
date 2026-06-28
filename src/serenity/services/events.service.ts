import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../infrastructure/persistence/relational/entities/event.entity';
import { EventBookingEntity } from '../infrastructure/persistence/relational/entities/event-booking.entity';
import { CreateEventBookingDto, CreateEventDto } from '../dto/serenity.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(EventBookingEntity)
    private readonly bookingRepository: Repository<EventBookingEntity>,
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
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return this.toDetail(event);
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
        registrationOpenAt: now,
        registrationCloseAt: null,
      }),
    );

    return this.toDetail(event);
  }

  async createBooking(
    userId: number,
    eventId: string,
    dto: CreateEventBookingDto,
  ) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const booking = await this.bookingRepository.save(
      this.bookingRepository.create({
        id: `ebk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventId,
        userId,
        bookingNumber: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'confirmed',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        guestCount: dto.guestCount,
        note: dto.note ?? null,
      }),
    );

    return {
      id: booking.id,
      eventId: booking.eventId,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      guestCount: booking.guestCount,
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
    };
  }

  private toDetail(event: EventEntity) {
    return {
      ...this.toSummary(event),
      description: event.description,
      agenda: event.agenda,
      menuHighlights: event.menuHighlights,
      hostName: event.hostName,
      maxGuests: event.maxGuests,
      registrationOpenAt: event.registrationOpenAt?.toISOString() ?? '',
      registrationCloseAt: event.registrationCloseAt?.toISOString() ?? '',
    };
  }
}
