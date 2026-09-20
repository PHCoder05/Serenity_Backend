import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderIdempotencyEnterprise1773300000000 implements MigrationInterface {
  name = 'OrderIdempotencyEnterprise1773300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "idempotencyFingerprint" character varying(64)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_serenity_order_user_idempotency"
      ON "serenity_order" ("userId", "idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_serenity_order_user_idempotency"`,
    );
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN IF EXISTS "idempotencyFingerprint"
    `);
  }
}
