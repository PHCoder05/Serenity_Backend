import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileDobAndEventReject1774500000000
  implements MigrationInterface
{
  name = 'ProfileDobAndEventReject1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      ADD COLUMN IF NOT EXISTS "dateOfBirth" date
    `);
    await queryRunner.query(`
      ALTER TABLE "event"
      ADD COLUMN IF NOT EXISTS "createdByUserId" integer,
      ADD COLUMN IF NOT EXISTS "rejectReason" text,
      ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "event"
      DROP COLUMN IF EXISTS "rejectedAt",
      DROP COLUMN IF EXISTS "rejectReason",
      DROP COLUMN IF EXISTS "createdByUserId"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      DROP COLUMN IF EXISTS "dateOfBirth"
    `);
  }
}
