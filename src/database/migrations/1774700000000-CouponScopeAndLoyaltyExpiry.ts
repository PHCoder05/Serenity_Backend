import { MigrationInterface, QueryRunner } from 'typeorm';

export class CouponScopeAndLoyaltyExpiry1774700000000
  implements MigrationInterface
{
  name = 'CouponScopeAndLoyaltyExpiry1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coupon"
        ADD COLUMN IF NOT EXISTS "itemIds" jsonb,
        ADD COLUMN IF NOT EXISTS "categoryIds" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "loyalty_settings"
        ADD COLUMN IF NOT EXISTS "expiryDays" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loyalty_settings" DROP COLUMN IF EXISTS "expiryDays"
    `);
    await queryRunner.query(`
      ALTER TABLE "coupon"
        DROP COLUMN IF EXISTS "itemIds",
        DROP COLUMN IF EXISTS "categoryIds"
    `);
  }
}
