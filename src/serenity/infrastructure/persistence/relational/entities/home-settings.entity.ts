import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

export type HomeBanner = {
  id: string;
  title: string;
  body?: string;
  image?: string;
  href?: string;
  isActive: boolean;
  sortOrder: number;
};

@Entity({ name: 'home_settings' })
export class HomeSettingsEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  featuredMenuItemIds: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  banners: HomeBanner[];

  @Column({ type: 'int', default: 0 })
  deliveryFeeInr: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
