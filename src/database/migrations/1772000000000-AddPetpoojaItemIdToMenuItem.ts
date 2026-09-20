import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPetpoojaItemIdToMenuItem1772000000000 implements MigrationInterface {
  name = 'AddPetpoojaItemIdToMenuItem1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "menu_item"
      ADD COLUMN "petpoojaItemId" character varying(64)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_menu_item_petpoojaItemId"
      ON "menu_item" ("petpoojaItemId")
      WHERE "petpoojaItemId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_menu_item_petpoojaItemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_item" DROP COLUMN "petpoojaItemId"`,
    );
  }
}
