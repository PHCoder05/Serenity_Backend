import { MigrationInterface, QueryRunner } from 'typeorm';

export class Coupons1773200000000 implements MigrationInterface {
  name = 'Coupons1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "coupon" (
        "id" SERIAL NOT NULL,
        "code" character varying(64) NOT NULL,
        "type" character varying(16) NOT NULL,
        "value" integer NOT NULL,
        "minSubtotal" integer NOT NULL DEFAULT 0,
        "maxDiscount" integer,
        "startsAt" TIMESTAMP,
        "endsAt" TIMESTAMP,
        "maxRedemptions" integer,
        "redeemedCount" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupon_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_coupon_code" UNIQUE ("code")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon"`);
  }
}
