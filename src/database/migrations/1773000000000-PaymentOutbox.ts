import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentOutbox1773000000000 implements MigrationInterface {
  name = 'PaymentOutbox1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_outbox" (
        "id" SERIAL NOT NULL,
        "type" character varying(32) NOT NULL,
        "paymentIntentId" character varying(64) NOT NULL,
        "payload" text,
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 8,
        "nextAttemptAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastError" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_outbox_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_outbox_due"
        ON "payment_outbox" ("status", "nextAttemptAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_outbox_paymentIntentId"
        ON "payment_outbox" ("paymentIntentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_payment_outbox_paymentIntentId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_payment_outbox_due"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_outbox"`);
  }
}
