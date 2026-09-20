import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthGrowthPhoneGuest1773600000000 implements MigrationInterface {
  name = 'AuthGrowthPhoneGuest1773600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "phone_otp" (
        "id" SERIAL NOT NULL,
        "phone" character varying(32) NOT NULL,
        "codeHash" character varying(128) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "consumedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_phone_otp" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_phone_otp_phone_created"
      ON "phone_otp" ("phone", "createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "guestTokenHash" character varying(128),
      ADD COLUMN IF NOT EXISTS "guestPhone" character varying(32),
      ADD COLUMN IF NOT EXISTS "isGuestCheckout" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_serenity_order_guest_token"
      ON "serenity_order" ("guestTokenHash")
      WHERE "guestTokenHash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_serenity_order_guest_token"`,
    );
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN IF EXISTS "isGuestCheckout",
      DROP COLUMN IF EXISTS "guestPhone",
      DROP COLUMN IF EXISTS "guestTokenHash"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_phone_otp_phone_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "phone_otp"`);
  }
}
