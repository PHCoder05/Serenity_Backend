import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIdempotencyKey1772500000000 implements MigrationInterface {
  name = 'AddOrderIdempotencyKey1772500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN "idempotencyKey" character varying(128)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_serenity_order_idempotencyKey"
      ON "serenity_order" ("idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_serenity_order_idempotencyKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN "idempotencyKey"
    `);
  }
}
