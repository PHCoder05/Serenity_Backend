import { MigrationInterface, QueryRunner } from 'typeorm';

export class PluggablePayments1772800000000 implements MigrationInterface {
  name = 'PluggablePayments1772800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_gateway_config" (
        "id" SERIAL NOT NULL,
        "provider" character varying(32) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT false,
        "mode" character varying(16) NOT NULL DEFAULT 'test',
        "credentialsEncrypted" text NOT NULL,
        "webhookSecretEncrypted" text,
        "updatedByUserId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_gateway_config_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_gateway_config_provider" UNIQUE ("provider")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_intent"
        ADD COLUMN IF NOT EXISTS "provider" character varying(32),
        ADD COLUMN IF NOT EXISTS "externalOrderRef" character varying(120),
        ADD COLUMN IF NOT EXISTS "externalPaymentRef" character varying(120),
        ADD COLUMN IF NOT EXISTS "clientActionJson" text,
        ADD COLUMN IF NOT EXISTS "refundRef" character varying(120)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_intent_externalOrderRef"
        ON "payment_intent" ("externalOrderRef")
    `);

    await queryRunner.query(`
      ALTER TABLE "serenity_order"
        ADD COLUMN IF NOT EXISTS "paymentIntentId" character varying(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order" DROP COLUMN IF EXISTS "paymentIntentId"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_payment_intent_externalOrderRef"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_intent"
        DROP COLUMN IF EXISTS "provider",
        DROP COLUMN IF EXISTS "externalOrderRef",
        DROP COLUMN IF EXISTS "externalPaymentRef",
        DROP COLUMN IF EXISTS "clientActionJson",
        DROP COLUMN IF EXISTS "refundRef"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_gateway_config"`);
  }
}
