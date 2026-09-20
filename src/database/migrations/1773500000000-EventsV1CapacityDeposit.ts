import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventsV1CapacityDeposit1773500000000 implements MigrationInterface {
  name = 'EventsV1CapacityDeposit1773500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "event"
      ADD COLUMN IF NOT EXISTS "depositAmountInr" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "waitlistEnabled" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "event_booking"
      ADD COLUMN IF NOT EXISTS "paymentIntentId" character varying(64),
      ADD COLUMN IF NOT EXISTS "depositPaid" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_event_booking_event_status"
      ON "event_booking" ("eventId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_event_booking_event_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "event_booking"
      DROP COLUMN IF EXISTS "depositPaid",
      DROP COLUMN IF EXISTS "paymentIntentId"
    `);
    await queryRunner.query(`
      ALTER TABLE "event"
      DROP COLUMN IF EXISTS "waitlistEnabled",
      DROP COLUMN IF EXISTS "depositAmountInr"
    `);
  }
}
