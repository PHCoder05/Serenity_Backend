import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoyaltyRedemption1772700000000 implements MigrationInterface {
  name = 'AddLoyaltyRedemption1772700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "loyaltyDiscount" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "loyaltyPointsRedeemed" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "loyalty_transaction"
      ADD COLUMN IF NOT EXISTS "orderId" character varying(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loyalty_transaction" DROP COLUMN IF EXISTS "orderId"
    `);
    await queryRunner.query(`
      ALTER TABLE "serenity_order" DROP COLUMN IF EXISTS "loyaltyPointsRedeemed"
    `);
    await queryRunner.query(`
      ALTER TABLE "serenity_order" DROP COLUMN IF EXISTS "loyaltyDiscount"
    `);
  }
}
