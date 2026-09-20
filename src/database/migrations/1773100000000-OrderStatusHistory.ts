import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderStatusHistory1773100000000 implements MigrationInterface {
  name = 'OrderStatusHistory1773100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "order_status_history" (
        "id" SERIAL NOT NULL,
        "orderId" character varying(64) NOT NULL,
        "fromStatus" character varying(32),
        "toStatus" character varying(32) NOT NULL,
        "source" character varying(32) NOT NULL,
        "rawStatus" character varying(32),
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_status_history_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_status_history_orderId"
        ON "order_status_history" ("orderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_order_status_history_orderId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_history"`);
  }
}
