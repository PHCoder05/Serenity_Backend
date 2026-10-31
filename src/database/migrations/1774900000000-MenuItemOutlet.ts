import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuItemOutlet1774900000000 implements MigrationInterface {
  name = 'MenuItemOutlet1774900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "menu_item"
      ADD COLUMN IF NOT EXISTS "outletId" character varying(64)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_menu_item_outletId"
      ON "menu_item" ("outletId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_menu_item_outletId"`);
    await queryRunner.query(`
      ALTER TABLE "menu_item" DROP COLUMN IF EXISTS "outletId"
    `);
  }
}
