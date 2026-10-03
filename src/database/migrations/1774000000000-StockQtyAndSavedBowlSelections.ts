import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockQtyAndSavedBowlSelections1774000000000
  implements MigrationInterface
{
  name = 'StockQtyAndSavedBowlSelections1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "menu_item"
      ADD COLUMN IF NOT EXISTS "stockQty" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "saved_bowl"
      ADD COLUMN IF NOT EXISTS "menuItemId" character varying(120),
      ADD COLUMN IF NOT EXISTS "diySelections" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "saved_bowl"
      DROP COLUMN IF EXISTS "diySelections",
      DROP COLUMN IF EXISTS "menuItemId"
    `);
    await queryRunner.query(`
      ALTER TABLE "menu_item"
      DROP COLUMN IF EXISTS "stockQty"
    `);
  }
}
