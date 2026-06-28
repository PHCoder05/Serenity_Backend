import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

export type MenuVariantJson = {
  id: string;
  label: string;
  priceDelta: number;
};

export type MenuExtraJson = {
  id: string;
  label: string;
  price: number;
};

@Entity({ name: 'menu_item' })
export class MenuItemEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  petpoojaItemId: string | null;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  shortLabel: string;

  @Column({ type: 'text' })
  image: string;

  @Column({ length: 64 })
  category: string;

  @Column({ type: 'int' })
  basePrice: number;

  @Column({ type: 'jsonb', default: [] })
  moods: string[];

  @Column({ type: 'jsonb', nullable: true })
  variants: MenuVariantJson[] | null;

  @Column({ type: 'jsonb', nullable: true })
  extras: MenuExtraJson[] | null;

  @Column({ default: true })
  isCustomizable: boolean;

  @Column({ default: true })
  inStock: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
