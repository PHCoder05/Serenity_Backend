import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderLineMenuItemId1772600000000 implements MigrationInterface {
  name = 'AddOrderLineMenuItemId1772600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_line_item"
      ADD COLUMN IF NOT EXISTS "menuItemId" character varying(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "order_line_item"
      ADD COLUMN IF NOT EXISTS "detail" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_line_item" DROP COLUMN IF EXISTS "detail"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_line_item" DROP COLUMN IF EXISTS "menuItemId"
    `);
  }
}
