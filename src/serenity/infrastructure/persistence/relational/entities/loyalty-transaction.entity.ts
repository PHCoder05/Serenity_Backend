import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'loyalty_transaction' })
export class LoyaltyTransactionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  label: string;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  orderId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
