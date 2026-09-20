import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'payment_webhook_event' })
export class PaymentWebhookEventEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  @Column({ type: 'varchar', length: 128 })
  eventId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  externalOrderRef: string | null;

  @Column({ type: 'varchar', length: 24 })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
