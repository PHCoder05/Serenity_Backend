import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashSeedPassword } from '../../seed-password';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Injectable()
export class UserSeedService {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async run() {
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return;
    }

    const countAdmin = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.admin,
        },
      },
    });

    if (!countAdmin) {
      const password = await hashSeedPassword('SEED_ADMIN_PASSWORD');
      if (!password) {
        this.logger.warn(
          'Skipped admin seed. Set SEED_ADMIN_PASSWORD to a value other than "secret".',
        );
      } else {
        await this.repository.save(
          this.repository.create({
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@example.com',
            password,
            role: {
              id: RoleEnum.admin,
              name: 'Admin',
            },
            status: {
              id: StatusEnum.active,
              name: 'Active',
            },
          }),
        );
      }
    }

    const countUser = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.user,
        },
      },
    });

    if (!countUser) {
      const password = await hashSeedPassword('SEED_USER_PASSWORD');
      if (!password) {
        this.logger.warn(
          'Skipped user seed. Set SEED_USER_PASSWORD to a value other than "secret".',
        );
      } else {
        await this.repository.save(
          this.repository.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            password,
            role: {
              id: RoleEnum.user,
              name: 'Admin',
            },
            status: {
              id: StatusEnum.active,
              name: 'Active',
            },
          }),
        );
      }
    }
  }
}
