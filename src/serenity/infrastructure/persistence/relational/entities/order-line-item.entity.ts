import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { SerenityOrderEntity } from './serenity-order.entity';

@Entity({ name: 'order_line_item' })
export class OrderLineItemEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  orderId: string;

  @ManyToOne(() => SerenityOrderEntity, (order) => order.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order?: SerenityOrderEntity;

  @Column()
  title: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  linePrice: number;

  @Column({ type: 'jsonb', default: [] })
  ingredients: string[];
}
