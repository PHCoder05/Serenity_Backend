import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'auth_rate_limit' })
@Index('IDX_auth_rate_limit_key_hitAt', ['key', 'hitAt'])
export class AuthRateLimitEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 160 })
  key: string;

  @Column({ type: 'timestamp' })
  hitAt: Date;
}
