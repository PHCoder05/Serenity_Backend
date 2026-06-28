import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'diet_preference' })
export class DietPreferenceEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column()
  label: string;

  @Column({ type: 'text' })
  description: string;
}
