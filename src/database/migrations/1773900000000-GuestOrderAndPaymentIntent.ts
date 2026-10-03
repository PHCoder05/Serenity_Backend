import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestOrderAndPaymentIntent1773900000000
  implements MigrationInterface
{
  name = 'GuestOrderAndPaymentIntent1773900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ALTER COLUMN "userId" DROP NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_serenity_order_payment_intent"
      ON "serenity_order" ("paymentIntentId")
      WHERE "paymentIntentId" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_serenity_order_guest_idempotency"
      ON "serenity_order" ("guestPhone", "idempotencyKey")
      WHERE "isGuestCheckout" = true AND "idempotencyKey" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_event_booking_payment_intent"
      ON "event_booking" ("paymentIntentId")
      WHERE "paymentIntentId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_event_booking_payment_intent"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_serenity_order_guest_idempotency"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_serenity_order_payment_intent"`,
    );
    await queryRunner.query(`
      DELETE FROM "serenity_order" WHERE "userId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ALTER COLUMN "userId" SET NOT NULL
    `);
  }
}
