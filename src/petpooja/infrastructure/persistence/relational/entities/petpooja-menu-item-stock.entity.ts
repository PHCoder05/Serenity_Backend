import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'petpooja_menu_item_stock' })
@Index(['restId', 'itemId', 'type'], { unique: true })
export class PetpoojaMenuItemStockEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String })
  restId: string;

  @Column({ type: String })
  itemId: string;

  @Column({ type: String })
  type: string;

  @Column({ type: Boolean })
  inStock: boolean;

  @Column({ type: String, nullable: true })
  autoTurnOnTime: string | null;

  @Column({ type: String, nullable: true })
  customTurnOnTime: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
