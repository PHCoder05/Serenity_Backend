import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { OrderLineItemEntity } from './order-line-item.entity';

@Entity({ name: 'serenity_order' })
export class SerenityOrderEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column()
  userId: number;

  @Column({ length: 32, default: 'confirmed' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  petpoojaOrderId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey: string | null;

  @Column({ length: 32, default: 'pending' })
  kitchenSyncStatus: string;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'int', nullable: true })
  foodRating: number | null;

  @Column({ type: 'int', nullable: true })
  serviceRating: number | null;

  @Column({ type: 'text', nullable: true })
  feedbackNote: string | null;

  @Column({ type: 'timestamp', nullable: true })
  feedbackAt: Date | null;

  @Column({ type: 'timestamp' })
  orderedAt: Date;

  @Column()
  itemSummary: string;

  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  subtotal: number;

  @Column({ type: 'int', default: 0 })
  couponDiscount: number;

  @Column({ type: 'int', default: 0 })
  gst: number;

  @Column({ type: 'int' })
  amountPaid: number;

  @Column({ length: 32, default: 'UPI' })
  paidVia: string;

  @OneToMany(() => OrderLineItemEntity, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  lineItems?: OrderLineItemEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
