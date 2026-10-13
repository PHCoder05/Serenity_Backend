import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderFulfillmentFields1774100000000 implements MigrationInterface {
  name = 'OrderFulfillmentFields1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "fulfillmentType" character varying(16),
      ADD COLUMN IF NOT EXISTS "tableNumber" integer,
      ADD COLUMN IF NOT EXISTS "deliveryAddress" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN IF EXISTS "deliveryAddress",
      DROP COLUMN IF EXISTS "tableNumber",
      DROP COLUMN IF EXISTS "fulfillmentType"
    `);
  }
}
