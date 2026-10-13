import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileNotificationPrefs1774300000000
  implements MigrationInterface
{
  name = 'ProfileNotificationPrefs1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      ADD COLUMN IF NOT EXISTS "pushEnabled" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      ADD COLUMN IF NOT EXISTS "emailEnabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      DROP COLUMN IF EXISTS "emailEnabled",
      DROP COLUMN IF EXISTS "pushEnabled"
    `);
  }
}
