import { MigrationInterface, QueryRunner } from 'typeorm';

export class SowCheckoutAndCms1774400000000 implements MigrationInterface {
  name = 'SowCheckoutAndCms1774400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "home_settings" (
        "id" integer PRIMARY KEY,
        "featuredMenuItemIds" jsonb NOT NULL DEFAULT '[]',
        "banners" jsonb NOT NULL DEFAULT '[]',
        "deliveryFeeInr" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "home_settings" ("id", "featuredMenuItemIds")
      VALUES (1, '["golden-lentil-bowl","garden-greens-bowl"]')
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "deliveryFee" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN IF EXISTS "deliveryFee"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "home_settings"`);
  }
}
