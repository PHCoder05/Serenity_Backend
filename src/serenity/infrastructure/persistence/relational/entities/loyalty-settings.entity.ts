import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'loyalty_settings' })
export class LoyaltySettingsEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'int', default: 1 })
  pointValueInr: number;

  @Column({ type: 'float', default: 0.2 })
  maxRedeemPercent: number;

  @Column({ type: 'float', default: 0.2 })
  earnRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
