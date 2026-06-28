import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentIntentTable1772400000000 implements MigrationInterface {
  name = 'CreatePaymentIntentTable1772400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_intent" (
        "id" character varying(64) NOT NULL,
        "userId" integer NOT NULL,
        "amount" integer NOT NULL,
        "currency" character varying(16) NOT NULL,
        "method" character varying(16) NOT NULL,
        "status" character varying(24) NOT NULL DEFAULT 'created',
        "externalReference" character varying(120),
        "failureReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_intent_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_intent_userId" ON "payment_intent" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_intent_status" ON "payment_intent" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_intent_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_intent_userId"`);
    await queryRunner.query(`DROP TABLE "payment_intent"`);
  }
}
