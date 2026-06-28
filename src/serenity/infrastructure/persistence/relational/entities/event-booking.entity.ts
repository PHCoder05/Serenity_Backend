import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { EventEntity } from './event.entity';

@Entity({ name: 'event_booking' })
export class EventBookingEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  eventId: string;

  @ManyToOne(() => EventEntity, (event) => event.bookings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event?: EventEntity;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 64 })
  bookingNumber: string;

  @Column({ type: 'varchar', length: 24, default: 'confirmed' })
  status: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 120 })
  email: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'int', default: 1 })
  guestCount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
