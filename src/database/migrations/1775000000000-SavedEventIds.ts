import { MigrationInterface, QueryRunner } from 'typeorm';

export class SavedEventIds1775000000000 implements MigrationInterface {
  name = 'SavedEventIds1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      ADD COLUMN IF NOT EXISTS "savedEventIds" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"
      DROP COLUMN IF EXISTS "savedEventIds"
    `);
  }
}
