import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderRiderFields1773800000000 implements MigrationInterface {
  name = 'OrderRiderFields1773800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "riderName" character varying(120),
      ADD COLUMN IF NOT EXISTS "riderPhone" character varying(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN IF EXISTS "riderPhone",
      DROP COLUMN IF EXISTS "riderName"
    `);
  }
}
