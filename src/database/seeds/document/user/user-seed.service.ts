import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { hashSeedPassword } from '../../seed-password';
import { Model } from 'mongoose';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserSchemaClass } from '../../../../users/infrastructure/persistence/document/entities/user.schema';

@Injectable()
export class UserSeedService {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly model: Model<UserSchemaClass>,
  ) {}

  async run() {
    const admin = await this.model.findOne({
      email: 'admin@example.com',
    });

    if (!admin) {
      const password = await hashSeedPassword('SEED_ADMIN_PASSWORD');
      if (!password) {
        this.logger.warn(
          'Skipped admin seed. Set SEED_ADMIN_PASSWORD to a value other than "secret".',
        );
      } else {
        const data = new this.model({
          email: 'admin@example.com',
          password: password,
          firstName: 'Super',
          lastName: 'Admin',
          role: {
            _id: RoleEnum.admin.toString(),
          },
          status: {
            _id: StatusEnum.active.toString(),
          },
        });
        await data.save();
      }
    }

    const user = await this.model.findOne({
      email: 'john.doe@example.com',
    });

    if (!user) {
      const password = await hashSeedPassword('SEED_USER_PASSWORD');
      if (!password) {
        this.logger.warn(
          'Skipped user seed. Set SEED_USER_PASSWORD to a value other than "secret".',
        );
      } else {
        const data = new this.model({
          email: 'john.doe@example.com',
          password: password,
          firstName: 'John',
          lastName: 'Doe',
          role: {
            _id: RoleEnum.user.toString(),
          },
          status: {
            _id: StatusEnum.active.toString(),
          },
        });
        await data.save();
      }
    }
  }
}
