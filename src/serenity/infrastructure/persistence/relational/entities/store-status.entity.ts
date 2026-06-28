import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'store_status' })
export class StoreStatusEntity extends EntityRelationalHelper {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ default: true })
  isOpen: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message: string | null;

  @Column({ type: 'timestamp', nullable: true })
  nextOpenAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
