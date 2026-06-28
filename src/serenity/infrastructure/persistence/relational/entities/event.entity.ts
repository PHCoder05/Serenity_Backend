import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { EventBookingEntity } from './event-booking.entity';

@Entity({ name: 'event' })
export class EventEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text' })
  subtitle: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 64 })
  dateLabel: string;

  @Column({ type: 'varchar', length: 120 })
  location: string;

  @Column({ type: 'varchar', length: 32, default: 'Public' })
  audience: string;

  @Column({ type: 'varchar', length: 32, default: 'planned' })
  status: string;

  @Column({ type: 'text' })
  image: string;

  @Column({ type: 'jsonb', default: [] })
  agenda: string[];

  @Column({ type: 'jsonb', default: [] })
  menuHighlights: string[];

  @Column({ type: 'varchar', length: 120, default: 'Serenity Team' })
  hostName: string;

  @Column({ type: 'int', default: 100 })
  maxGuests: number;

  @Column({ type: 'timestamp', nullable: true })
  registrationOpenAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  registrationCloseAt: Date | null;

  @OneToMany(() => EventBookingEntity, (booking) => booking.event)
  bookings?: EventBookingEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
