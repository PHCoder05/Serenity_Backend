import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentHardening1772900000000 implements MigrationInterface {
  name = 'PaymentHardening1772900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_webhook_event" (
        "id" SERIAL NOT NULL,
        "provider" character varying(32) NOT NULL,
        "eventId" character varying(128) NOT NULL,
        "externalOrderRef" character varying(120),
        "status" character varying(24) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_webhook_event_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_webhook_event_provider_event"
          UNIQUE ("provider", "eventId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_gateway_audit" (
        "id" SERIAL NOT NULL,
        "userId" integer,
        "action" character varying(64) NOT NULL,
        "provider" character varying(32) NOT NULL,
        "detail" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_gateway_audit_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_audit_provider"
        ON "payment_gateway_audit" ("provider")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_payment_gateway_audit_provider"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_gateway_audit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_webhook_event"`);
  }
}
