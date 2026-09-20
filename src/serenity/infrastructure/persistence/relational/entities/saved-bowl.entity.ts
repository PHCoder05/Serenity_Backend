import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'saved_bowl' })
export class SavedBowlEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ default: '' })
  note: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'text' })
  image: string;

  @Column({ type: 'jsonb', default: [] })
  ingredients: string[];

  @Column({ type: 'jsonb', default: [] })
  addons: string[];

  @Column({ type: 'text', default: '' })
  savedNote: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
