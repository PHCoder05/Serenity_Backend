import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'petpooja_order' })
@Index(['restId', 'orderId'], { unique: true })
export class PetpoojaOrderEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String })
  restId: string;

  @Column({ type: String })
  orderId: string;

  @Column({ type: String, nullable: true })
  clientOrderId: string | null;

  @Column({ type: String })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  orderInfo: Record<string, unknown> | null;

  @Column({ type: String, nullable: true })
  cancelReason: string | null;

  @Column({ type: 'integer', nullable: true })
  minimumPrepTime: number | null;

  @Column({ type: String, nullable: true })
  riderName: string | null;

  @Column({ type: String, nullable: true })
  riderPhone: string | null;

  @Column({ type: String, nullable: true })
  isModified: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
