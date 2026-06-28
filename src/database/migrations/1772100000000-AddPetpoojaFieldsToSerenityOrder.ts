import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPetpoojaFieldsToSerenityOrder1772100000000 implements MigrationInterface {
  name = 'AddPetpoojaFieldsToSerenityOrder1772100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN "petpoojaOrderId" character varying(64),
      ADD COLUMN "kitchenSyncStatus" character varying(32) NOT NULL DEFAULT 'pending',
      ADD COLUMN "cancelReason" text
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_serenity_order_petpoojaOrderId"
      ON "serenity_order" ("petpoojaOrderId")
      WHERE "petpoojaOrderId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_serenity_order_petpoojaOrderId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN "cancelReason",
      DROP COLUMN "kitchenSyncStatus",
      DROP COLUMN "petpoojaOrderId"
    `);
  }
}
